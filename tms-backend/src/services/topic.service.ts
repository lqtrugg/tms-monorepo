import { EntityManager, In, IsNull } from 'typeorm';

import { AppDataSource } from '../data-source.js';
import { Class, ClassStatus, Enrollment, Student, Teacher, Topic, TopicProblem, TopicStanding } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  extractGymIdFromLink,
  fetchCodeforcesGymMetadata,
  resolveCodeforcesCredentials,
  type CodeforcesCredentials,
} from './codeforces-api.service.js';

type TopicStatusFilter = 'active' | 'expired';

function normalizeTopicStatus(topic: Topic): TopicStatusFilter {
  if (!topic.expires_at) {
    return 'active';
  }

  return topic.expires_at.getTime() < Date.now() ? 'expired' : 'active';
}

async function syncGymMetadata(
  gymLink: string,
  credentials: CodeforcesCredentials | null,
): Promise<{ gym_id: string; title: string }> {
  const gymId = extractGymIdFromLink(gymLink);

  if (!gymId) {
    throw new ServiceError('gym_link must contain a valid gym id', 400);
  }

  return fetchCodeforcesGymMetadata(gymId, credentials);
}

async function requireOwnedClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  const classEntity = await manager.getRepository(Class).findOneBy({
    id: classId,
    teacher_id: teacherId,
  });

  if (!classEntity) {
    throw new ServiceError('class not found', 404);
  }

  return classEntity;
}

async function requireOwnedTopic(manager: EntityManager, teacherId: number, topicId: number): Promise<Topic> {
  const topic = await manager.getRepository(Topic).findOneBy({
    id: topicId,
    teacher_id: teacherId,
  });

  if (!topic) {
    throw new ServiceError('topic not found', 404);
  }

  return topic;
}

async function getTeacherCodeforcesCredentials(
  manager: EntityManager,
  teacherId: number,
): Promise<CodeforcesCredentials | null> {
  const teacher = await manager.getRepository(Teacher).findOneBy({
    id: teacherId,
  });

  if (!teacher) {
    throw new ServiceError('teacher not found', 404);
  }

  return resolveCodeforcesCredentials(teacher.codeforces_api_key, teacher.codeforces_api_secret);
}

export async function listTopics(teacherId: number, filters: {
  class_id?: number;
  status?: TopicStatusFilter;
}) {
  if (filters.class_id !== undefined) {
    await requireOwnedClass(AppDataSource.manager, teacherId, filters.class_id);
  }

  const topics = await AppDataSource.getRepository(Topic).find({
    where: {
      teacher_id: teacherId,
      ...(filters.class_id !== undefined ? { class_id: filters.class_id } : {}),
    },
    order: {
      created_at: 'DESC',
    },
  });

  return topics
    .map((topic) => ({
      ...topic,
      status: normalizeTopicStatus(topic),
    }))
    .filter((topic) => !filters.status || topic.status === filters.status);
}

export async function createTopic(teacherId: number, input: {
  class_id: number;
  gym_link: string;
  expires_at?: Date | null;
  pull_interval_minutes?: number;
}) {
  return AppDataSource.transaction(async (manager) => {
    const classEntity = await requireOwnedClass(manager, teacherId, input.class_id);
    if (classEntity.status !== ClassStatus.Active) {
      throw new ServiceError('class is archived', 409);
    }

    const gymLink = input.gym_link.trim();
    let parsedGymLink: URL;
    try {
      parsedGymLink = new URL(gymLink);
    } catch {
      throw new ServiceError('gym_link must be a valid URL', 400);
    }

    if (parsedGymLink.protocol !== 'http:' && parsedGymLink.protocol !== 'https:') {
      throw new ServiceError('gym_link must start with http:// or https://', 400);
    }

    const codeforcesCredentials = await getTeacherCodeforcesCredentials(manager, teacherId);
    const gymMetadata = await syncGymMetadata(parsedGymLink.toString(), codeforcesCredentials);

    const topicRepo = manager.getRepository(Topic);
    const topic = topicRepo.create({
      teacher_id: teacherId,
      class_id: input.class_id,
      title: gymMetadata.title,
      gym_link: parsedGymLink.toString(),
      gym_id: gymMetadata.gym_id,
      expires_at: input.expires_at ?? null,
      pull_interval_minutes: input.pull_interval_minutes ?? 60,
      last_pulled_at: null,
    });

    return topicRepo.save(topic);
  });
}

export async function addTopicProblem(teacherId: number, topicId: number, input: {
  problem_index: string;
  problem_name?: string | null;
}) {
  return AppDataSource.transaction(async (manager) => {
    await requireOwnedTopic(manager, teacherId, topicId);

    const repo = manager.getRepository(TopicProblem);
    const existing = await repo.findOneBy({
      topic_id: topicId,
      problem_index: input.problem_index.trim(),
    });

    if (existing) {
      existing.problem_name = input.problem_name?.trim() || null;
      return repo.save(existing);
    }

    const problem = repo.create({
      teacher_id: teacherId,
      topic_id: topicId,
      problem_index: input.problem_index.trim(),
      problem_name: input.problem_name?.trim() || null,
    });

    return repo.save(problem);
  });
}

export async function upsertTopicStanding(teacherId: number, topicId: number, input: {
  student_id: number;
  problem_id: number;
  solved: boolean;
  penalty_minutes?: number | null;
  pulled_at?: Date;
}) {
  return AppDataSource.transaction(async (manager) => {
    const topic = await requireOwnedTopic(manager, teacherId, topicId);

    const student = await manager.getRepository(Student).findOneBy({
      id: input.student_id,
      teacher_id: teacherId,
    });
    if (!student) {
      throw new ServiceError('student not found', 404);
    }

    const problem = await manager.getRepository(TopicProblem).findOneBy({
      id: input.problem_id,
      teacher_id: teacherId,
      topic_id: topicId,
    });
    if (!problem) {
      throw new ServiceError('topic problem not found', 404);
    }

    const repo = manager.getRepository(TopicStanding);
    const existing = await repo.findOneBy({
      teacher_id: teacherId,
      topic_id: topic.id,
      student_id: input.student_id,
      problem_id: input.problem_id,
    });

    if (existing) {
      existing.solved = input.solved;
      existing.penalty_minutes = input.penalty_minutes ?? null;
      existing.pulled_at = input.pulled_at ?? new Date();
      return repo.save(existing);
    }

    const standing = repo.create({
      teacher_id: teacherId,
      topic_id: topic.id,
      student_id: input.student_id,
      problem_id: input.problem_id,
      solved: input.solved,
      penalty_minutes: input.penalty_minutes ?? null,
      pulled_at: input.pulled_at ?? new Date(),
    });

    return repo.save(standing);
  });
}

export async function getTopicStandingMatrix(teacherId: number, topicId: number) {
  const topic = await requireOwnedTopic(AppDataSource.manager, teacherId, topicId);

  const problems = await AppDataSource.getRepository(TopicProblem).find({
    where: {
      teacher_id: teacherId,
      topic_id: topicId,
    },
    order: {
      problem_index: 'ASC',
    },
  });

  const activeEnrollments = await AppDataSource.getRepository(Enrollment).find({
    where: {
      teacher_id: teacherId,
      class_id: topic.class_id,
      unenrolled_at: IsNull(),
    },
  });
  const studentIds = Array.from(new Set(activeEnrollments.map((item) => item.student_id)));
  const students = studentIds.length > 0
    ? await AppDataSource.getRepository(Student).findBy({
      teacher_id: teacherId,
      id: In(studentIds),
    })
    : [];

  const standings = await AppDataSource.getRepository(TopicStanding).find({
    where: {
      teacher_id: teacherId,
      topic_id: topicId,
    },
  });

  const standingMap = new Map<string, TopicStanding>();
  standings.forEach((standing) => {
    standingMap.set(`${standing.student_id}:${standing.problem_id}`, standing);
  });

  const rows = students
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
    .map((student) => {
      const problemRows = problems.map((problem) => {
        const standing = standingMap.get(`${student.id}:${problem.id}`);
        return {
          problem_id: problem.id,
          problem_index: problem.problem_index,
          problem_name: problem.problem_name,
          solved: standing?.solved ?? false,
          penalty_minutes: standing?.penalty_minutes ?? null,
          pulled_at: standing?.pulled_at ?? null,
        };
      });

      return {
        student_id: student.id,
        student_name: student.full_name,
        solved_count: problemRows.filter((item) => item.solved).length,
        problems: problemRows,
      };
    });

  return {
    topic,
    problems,
    rows,
  };
}
