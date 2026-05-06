import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import { Class, ClassStatus, Student, Topic, TopicProblem } from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import type { DbContext } from '../../infrastructure/database/db-context.js';
import {
  CodeforcesClient,
  extractGymIdFromLink,
  resolveCodeforcesCredentials,
  type CodeforcesCredentials,
} from '../../integrations/codeforces/codeforces-api.service.js';
import {
  createTopicEntity,
  createTopicProblemEntity,
  createTopicStandingEntity,
  findTeacherById,
  findTopicByGym,
  findTopicProblemByIndex,
  findTopicStanding,
  listTopicsForTeacher,
  saveTopic,
  saveTopicProblem,
  saveTopicStanding,
} from './topic.repository.js';

type TopicStatusFilter = 'active' | 'closed';

function normalizeTopicStatus(topic: Topic): TopicStatusFilter {
  return topic.closed_at ? 'closed' : 'active';
}

async function syncGymMetadata(
  gymLink: string,
  codeforces: CodeforcesClient,
): Promise<{ gym_id: string; title: string }> {
  const gymId = extractGymIdFromLink(gymLink);

  if (!gymId) {
    throw new ServiceError('gym_link must contain a valid gym id', 400);
  }

  return codeforces.fetchGymMetadata(gymId);
}

async function requireTopicById(manager: EntityManager, topicId: number): Promise<Topic> {
  const topic = await manager.getRepository(Topic).findOneBy({ id: topicId });

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
    const classEntity = await manager.getRepository(Class).findOneBy({ id: input.class_id });
    if (!classEntity) {
      throw new ServiceError('class not found', 404);
    }

    if (classEntity.status !== ClassStatus.Active) {
      throw new ServiceError('class is archived', 409);
    }

    const codeforcesCredentials = await getTeacherCodeforcesCredentials(manager, teacherId);
    const codeforces = new CodeforcesClient(codeforcesCredentials);
    const gymMetadata = await syncGymMetadata(input.gym_link, codeforces);

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
    const topic = await requireTopicById(manager, topicId);
    topic.closed_at = new Date();

    return saveTopic(manager, topic);
  });
}

export async function addTopicProblem(teacherId: number, topicId: number, input: {
  problem_index: string;
  problem_name?: string | null;
}) {
  return AppDataSource.transaction(async (manager) => {
    await requireTopicById(manager, topicId);

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
    const topic = await requireTopicById(manager, topicId);

    const student = await manager.getRepository(Student).findOneBy({ id: input.student_id });
    if (!student) {
      throw new ServiceError('student not found', 404);
    }

    const problem = await manager.getRepository(TopicProblem).findOneBy({
      id: input.problem_id,
      topic_id: topicId,
    });
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

export class TopicService {
  constructor(private readonly db?: DbContext) {}

  listTopics(teacherId: number, filters: Parameters<typeof listTopics>[1]): ReturnType<typeof listTopics> {
    void this.db;
    return listTopics(teacherId, filters);
  }

  createTopic(teacherId: number, input: Parameters<typeof createTopic>[1]): ReturnType<typeof createTopic> {
    return createTopic(teacherId, input);
  }

  closeTopic(teacherId: number, topicId: number): ReturnType<typeof closeTopic> {
    return closeTopic(teacherId, topicId);
  }

  addTopicProblem(
    teacherId: number,
    topicId: number,
    input: Parameters<typeof addTopicProblem>[2],
  ): ReturnType<typeof addTopicProblem> {
    return addTopicProblem(teacherId, topicId, input);
  }

  upsertTopicStanding(
    teacherId: number,
    topicId: number,
    input: Parameters<typeof upsertTopicStanding>[2],
  ): ReturnType<typeof upsertTopicStanding> {
    return upsertTopicStanding(teacherId, topicId, input);
  }
}
