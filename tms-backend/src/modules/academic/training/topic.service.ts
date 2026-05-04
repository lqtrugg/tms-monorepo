import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import { Class, ClassStatus, Topic, TopicStanding } from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import {
  extractGymIdFromLink,
  fetchCodeforcesGymMetadata,
  resolveCodeforcesCredentials,
  type CodeforcesCredentials,
} from '../../../integrations/codeforces/codeforces-api.service.js';
import {
  createTopicEntity,
  createTopicProblemEntity,
  createTopicStandingEntity,
  findOwnedClass,
  findOwnedStudent,
  findOwnedTopic,
  findOwnedTopicProblem,
  findStudentsByIds,
  findTeacherById,
  findTopicByGym,
  findTopicProblemByIndex,
  findTopicStanding,
  listActiveEnrollmentsForClass,
  listTopicProblems,
  listTopicsForTeacher,
  listTopicStandings,
  saveTopic,
  saveTopicProblem,
  saveTopicStanding,
} from './training.repository.js';

type TopicStatusFilter = 'active' | 'closed';

function normalizeTopicStatus(topic: Topic): TopicStatusFilter {
  return topic.closed_at ? 'closed' : 'active';
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
  const classEntity = await findOwnedClass(manager, teacherId, classId);

  if (!classEntity) {
    throw new ServiceError('class not found', 404);
  }

  return classEntity;
}

async function requireOwnedTopic(manager: EntityManager, teacherId: number, topicId: number): Promise<Topic> {
  const topic = await findOwnedTopic(manager, teacherId, topicId);

  if (!topic) {
    throw new ServiceError('topic not found', 404);
  }

  return topic;
}

async function getTeacherCodeforcesCredentials(
  manager: EntityManager,
  teacherId: number,
): Promise<CodeforcesCredentials | null> {
  const teacher = await findTeacherById(manager, teacherId);

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

  const topics = await listTopicsForTeacher(teacherId, filters);

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
  pull_interval_minutes?: number;
}) {
  return AppDataSource.transaction(async (manager) => {
    const classEntity = await requireOwnedClass(manager, teacherId, input.class_id);
    if (classEntity.status !== ClassStatus.Active) {
      throw new ServiceError('class is archived', 409);
    }

    const codeforcesCredentials = await getTeacherCodeforcesCredentials(manager, teacherId);
    const gymMetadata = await syncGymMetadata(input.gym_link, codeforcesCredentials);

    const existing = await findTopicByGym(manager, teacherId, input.class_id, gymMetadata.gym_id);

    if (existing) {
      existing.title = gymMetadata.title;
      existing.gym_link = input.gym_link;
      existing.closed_at = null;
      existing.pull_interval_minutes = input.pull_interval_minutes ?? existing.pull_interval_minutes;
      return saveTopic(manager, existing);
    }

    const topic = createTopicEntity(manager, {
      teacher_id: teacherId,
      class_id: input.class_id,
      title: gymMetadata.title,
      gym_link: input.gym_link,
      gym_id: gymMetadata.gym_id,
      closed_at: null,
      pull_interval_minutes: input.pull_interval_minutes ?? 60,
      last_pulled_at: null,
    });

    return saveTopic(manager, topic);
  });
}

export async function closeTopic(teacherId: number, topicId: number) {
  return AppDataSource.transaction(async (manager) => {
    const topic = await requireOwnedTopic(manager, teacherId, topicId);
    topic.closed_at = new Date();

    return saveTopic(manager, topic);
  });
}

export async function addTopicProblem(teacherId: number, topicId: number, input: {
  problem_index: string;
  problem_name?: string | null;
}) {
  return AppDataSource.transaction(async (manager) => {
    await requireOwnedTopic(manager, teacherId, topicId);

    const existing = await findTopicProblemByIndex(manager, topicId, input.problem_index);

    if (existing) {
      existing.problem_name = input.problem_name ?? null;
      return saveTopicProblem(manager, existing);
    }

    const problem = createTopicProblemEntity(manager, {
      teacher_id: teacherId,
      topic_id: topicId,
      problem_index: input.problem_index,
      problem_name: input.problem_name ?? null,
    });

    return saveTopicProblem(manager, problem);
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

    const student = await findOwnedStudent(manager, teacherId, input.student_id);
    if (!student) {
      throw new ServiceError('student not found', 404);
    }

    const problem = await findOwnedTopicProblem(manager, teacherId, topicId, input.problem_id);
    if (!problem) {
      throw new ServiceError('topic problem not found', 404);
    }

    const existing = await findTopicStanding(manager, teacherId, topic.id, input.student_id, input.problem_id);

    if (existing) {
      existing.solved = input.solved;
      existing.penalty_minutes = input.penalty_minutes ?? null;
      existing.pulled_at = input.pulled_at ?? new Date();
      return saveTopicStanding(manager, existing);
    }

    const standing = createTopicStandingEntity(manager, {
      teacher_id: teacherId,
      topic_id: topic.id,
      student_id: input.student_id,
      problem_id: input.problem_id,
      solved: input.solved,
      penalty_minutes: input.penalty_minutes ?? null,
      pulled_at: input.pulled_at ?? new Date(),
    });

    return saveTopicStanding(manager, standing);
  });
}

export async function getTopicStandingMatrix(teacherId: number, topicId: number) {
  const topic = await requireOwnedTopic(AppDataSource.manager, teacherId, topicId);

  const problems = await listTopicProblems(teacherId, topicId);

  const activeEnrollments = await listActiveEnrollmentsForClass(teacherId, topic.class_id);
  const studentIds = Array.from(new Set(activeEnrollments.map((item) => item.student_id)));
  const students = await findStudentsByIds(teacherId, studentIds);

  const standings = await listTopicStandings(teacherId, topicId);

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
