import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  addTopicProblemBodySchema,
  createTopicBodySchema,
  topicIdParamSchema,
  topicListQuerySchema,
  upsertTopicStandingBodySchema,
  type AddTopicProblemBody,
  type CreateTopicBody,
  type TopicIdParam,
  type TopicListQuery,
  type UpsertTopicStandingBody,
} from './topic.schemas.js';
import { asyncHandler } from '../../shared/middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../../shared/middlewares/validate.js';
import { TopicService } from './topic.service.js';
import {
  authorizeOwnedClassBody,
  authorizeOwnedClassQuery,
  authorizeOwnedStudentBody,
  authorizeOwnedTopicParam,
  requireRoles,
} from '../identity/index.js';

export const topicRouter = Router();
const topicService = new TopicService();

topicRouter.use(passport.authenticate('jwt', { session: false }));
topicRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

topicRouter.get('/topics', validate({ query: topicListQuerySchema }), authorizeOwnedClassQuery(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<TopicListQuery>(res);
  const topics = await topicService.listTopics(teacherId, query);

  res.json({ topics });
}));

topicRouter.post('/topics', validate({ body: createTopicBodySchema }), authorizeOwnedClassBody('class_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const body = getValidatedBody<CreateTopicBody>(res);
  const topic = await topicService.createTopic(teacherId, body);

  res.status(201).json({ topic });
}));

topicRouter.post('/topics/:topicId/close', validate({ params: topicIdParamSchema }), authorizeOwnedTopicParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { topicId } = getValidatedParams<TopicIdParam>(res);
  const topic = await topicService.closeTopic(teacherId, topicId);

  res.json({ topic });
}));

topicRouter.post('/topics/:topicId/problems', validate({
  body: addTopicProblemBodySchema,
  params: topicIdParamSchema,
}), authorizeOwnedTopicParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { topicId } = getValidatedParams<TopicIdParam>(res);
  const body = getValidatedBody<AddTopicProblemBody>(res);
  const problem = await topicService.addTopicProblem(teacherId, topicId, body);

  res.status(201).json({ problem });
}));

topicRouter.put('/topics/:topicId/standings', validate({
  body: upsertTopicStandingBodySchema,
  params: topicIdParamSchema,
}), authorizeOwnedTopicParam(), authorizeOwnedStudentBody('student_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { topicId } = getValidatedParams<TopicIdParam>(res);
  const body = getValidatedBody<UpsertTopicStandingBody>(res);
  const standing = await topicService.upsertTopicStanding(teacherId, topicId, body);

  res.json({ standing });
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

topicRouter.use(handleServiceError);
