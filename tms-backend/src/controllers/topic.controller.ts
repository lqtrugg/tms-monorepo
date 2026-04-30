import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  asRecord,
  parseDateTime,
  parseOptionalString,
  parsePositiveInteger,
  parseRequiredString,
} from '../helpers/service.helpers.js';
import {
  addTopicProblem,
  closeTopic,
  createTopic,
  getTopicStandingMatrix,
  listTopics,
  upsertTopicStanding,
} from '../services/topic.service.js';
import { requireRoles } from '../services/auth.rbac.js';

export const topicRouter = Router();

topicRouter.use(passport.authenticate('jwt', { session: false }));
topicRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

function parseTopicStatus(value: unknown): 'active' | 'closed' | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== 'active' && value !== 'closed') {
    throw new ServiceError('status must be one of: active, closed', 400);
  }

  return value;
}

function parseOptionalInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parsePositiveInteger(value, fieldName);
}

function parseOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new ServiceError(`${fieldName} must be a boolean`, 400);
}

topicRouter.get('/topics', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const topics = await listTopics(teacherId, {
      class_id: parseOptionalInteger(query.class_id, 'class_id'),
      status: parseTopicStatus(query.status),
    });

    res.json({ topics });
  } catch (error) {
    next(error);
  }
});

topicRouter.post('/topics', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const body = asRecord(req.body, 'body');
    const topic = await createTopic(teacherId, {
      class_id: parsePositiveInteger(body.class_id, 'class_id'),
      gym_link: parseRequiredString(body.gym_link, 'gym_link'),
      pull_interval_minutes: parseOptionalInteger(body.pull_interval_minutes, 'pull_interval_minutes'),
    });

    res.status(201).json({ topic });
  } catch (error) {
    next(error);
  }
});

topicRouter.post('/topics/:topicId/close', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const topicId = parsePositiveInteger(req.params.topicId, 'topic_id');
    const topic = await closeTopic(teacherId, topicId);

    res.json({ topic });
  } catch (error) {
    next(error);
  }
});

topicRouter.post('/topics/:topicId/problems', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const topicId = parsePositiveInteger(req.params.topicId, 'topic_id');
    const body = asRecord(req.body, 'body');
    const problem = await addTopicProblem(teacherId, topicId, {
      problem_index: parseRequiredString(body.problem_index, 'problem_index'),
      problem_name: parseOptionalString(body.problem_name, 'problem_name') ?? null,
    });

    res.status(201).json({ problem });
  } catch (error) {
    next(error);
  }
});

topicRouter.put('/topics/:topicId/standings', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const topicId = parsePositiveInteger(req.params.topicId, 'topic_id');
    const body = asRecord(req.body, 'body');
    const standing = await upsertTopicStanding(teacherId, topicId, {
      student_id: parsePositiveInteger(body.student_id, 'student_id'),
      problem_id: parsePositiveInteger(body.problem_id, 'problem_id'),
      solved: parseOptionalBoolean(body.solved, 'solved') ?? false,
      penalty_minutes: body.penalty_minutes === undefined
        ? null
        : parseOptionalInteger(body.penalty_minutes, 'penalty_minutes') ?? null,
      pulled_at: body.pulled_at === undefined ? undefined : parseDateTime(body.pulled_at, 'pulled_at'),
    });

    res.json({ standing });
  } catch (error) {
    next(error);
  }
});

topicRouter.get('/topics/:topicId/standing', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const topicId = parsePositiveInteger(req.params.topicId, 'topic_id');
    const matrix = await getTopicStandingMatrix(teacherId, topicId);

    res.json(matrix);
  } catch (error) {
    next(error);
  }
});

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

topicRouter.use(handleServiceError);
