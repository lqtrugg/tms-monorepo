import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { DiscordMessageType, Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  asRecord,
  parseIntegerArrayFromBody,
  parseOptionalString,
  parsePositiveInteger,
  parseRequiredString,
} from '../helpers/service.helpers.js';
import {
  deleteDiscordServer,
  listDiscordServers,
  listMessages,
  sendChannelPost,
  sendBulkDm,
  upsertDiscordServerByClass,
} from '../services/messaging.service.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

export const messagingRouter = Router();

messagingRouter.use(passport.authenticate('jwt', { session: false }));
messagingRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

function parseMessageType(value: unknown): DiscordMessageType | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value !== DiscordMessageType.AutoNotification
    && value !== DiscordMessageType.ChannelPost
    && value !== DiscordMessageType.BulkDm
  ) {
    throw new ServiceError(
      `type must be one of: ${DiscordMessageType.AutoNotification}, ${DiscordMessageType.ChannelPost}, ${DiscordMessageType.BulkDm}`,
      400,
    );
  }

  return value;
}

function parseNullableOptionalString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return parseOptionalString(value, fieldName) ?? null;
}

messagingRouter.get('/discord/servers', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const servers = await listDiscordServers(teacherId);

    res.json({ servers });
  } catch (error) {
    next(error);
  }
});

messagingRouter.put('/classes/:classId/discord-server', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parsePositiveInteger(req.params.classId, 'class_id');
    const body = asRecord(req.body, 'body');
    const server = await upsertDiscordServerByClass(teacherId, classId, {
      discord_server_id: parseRequiredString(body.discord_server_id, 'discord_server_id'),
      bot_token: parseNullableOptionalString(body.bot_token, 'bot_token'),
      attendance_voice_channel_id: parseNullableOptionalString(body.attendance_voice_channel_id, 'attendance_voice_channel_id'),
      notification_channel_id: parseNullableOptionalString(body.notification_channel_id, 'notification_channel_id'),
    });

    res.json({ server });
  } catch (error) {
    next(error);
  }
});

messagingRouter.delete('/classes/:classId/discord-server', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parsePositiveInteger(req.params.classId, 'class_id');
    const result = await deleteDiscordServer(teacherId, classId);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

messagingRouter.get('/discord/messages', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const messages = await listMessages(teacherId, {
      type: parseMessageType(query.type),
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
});

messagingRouter.post('/discord/messages/bulk-dm', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const body = asRecord(req.body, 'body');
    const result = await sendBulkDm(teacherId, {
      content: parseRequiredString(body.content, 'content'),
      class_id: body.class_id === undefined ? undefined : parsePositiveInteger(body.class_id, 'class_id'),
      student_ids: parseIntegerArrayFromBody(body.student_ids, 'student_ids'),
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

messagingRouter.post('/discord/messages/channel-post', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const body = asRecord(req.body, 'body');
    const result = await sendChannelPost(teacherId, {
      content: parseRequiredString(body.content, 'content'),
      server_ids: parseIntegerArrayFromBody(body.server_ids, 'server_ids') ?? [],
    });

    res.status(201).json(result);
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

messagingRouter.use(handleServiceError);
