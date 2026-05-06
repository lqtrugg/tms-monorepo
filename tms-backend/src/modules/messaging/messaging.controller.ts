import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  bulkDmBodySchema,
  channelPostBodySchema,
  classIdParamSchema,
  messageListQuerySchema,
  upsertDiscordServerBodySchema,
  type BulkDmBody,
  type ChannelPostBody,
  type ClassIdParam,
  type MessageListQuery,
  type UpsertDiscordServerBody,
} from './messaging.schemas.js';
import { asyncHandler } from '../../shared/middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../../shared/middlewares/validate.js';
import { MessagingService } from './messaging.service.js';
import { authorizeOwnedClassBody, authorizeOwnedClassParam, requireRoles } from '../identity/index.js';

export const messagingRouter = Router();
const messagingService = new MessagingService();

messagingRouter.use(passport.authenticate('jwt', { session: false }));
messagingRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

messagingRouter.get('/discord/servers', asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const servers = await messagingService.listDiscordServers(teacherId);

  res.json({ servers });
}));

messagingRouter.put('/classes/:classId/discord-server', validate({
  body: upsertDiscordServerBodySchema,
  params: classIdParamSchema,
}), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const body = getValidatedBody<UpsertDiscordServerBody>(res);
  const server = await messagingService.upsertDiscordServerByClass(teacherId, classId, body);

  res.json({ server });
}));

messagingRouter.delete('/classes/:classId/discord-server', validate({ params: classIdParamSchema }), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const result = await messagingService.deleteDiscordServer(teacherId, classId);

  res.json(result);
}));

messagingRouter.get('/discord/messages', validate({ query: messageListQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<MessageListQuery>(res);
  const messages = await messagingService.listMessages(teacherId, {
    type: query.type,
  });

  res.json({ messages });
}));

messagingRouter.post('/discord/messages/bulk-dm', validate({ body: bulkDmBodySchema }), authorizeOwnedClassBody('class_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const body = getValidatedBody<BulkDmBody>(res);
  const result = await messagingService.sendBulkDm(teacherId, body);

  res.status(201).json(result);
}));

messagingRouter.post('/discord/messages/channel-post', validate({ body: channelPostBodySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const body = getValidatedBody<ChannelPostBody>(res);
  const result = await messagingService.sendChannelPost(teacherId, body);

  res.status(201).json(result);
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

messagingRouter.use(handleServiceError);
