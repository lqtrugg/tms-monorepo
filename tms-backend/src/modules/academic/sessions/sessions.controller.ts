import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import {
  attendanceListQuerySchema,
  sessionIdParamSchema,
  sessionStudentIdParamSchema,
  upsertAttendanceBodySchema,
  type AttendanceListQuery,
  type SessionIdParam,
  type SessionStudentIdParam,
  type UpsertAttendanceBody,
} from './sessions.schemas.js';
import { asyncHandler } from '../../../shared/middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../../../shared/middlewares/validate.js';
import { authorizeOwnedSessionParam, authorizeOwnedStudentParam, requireRoles } from '../../identity/index.js';
import {
  listAttendanceRecords,
  listSessionAttendance,
  resetSessionAttendance,
  upsertSessionAttendance,
} from './sessions.service.js';
import { syncVoiceAttendanceForSession } from './jobs/voice-attendance-sync.job.js';

export const sessionsRouter = Router();

sessionsRouter.use(passport.authenticate('jwt', { session: false }));
sessionsRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

sessionsRouter.get('/sessions/:sessionId/attendance', validate({ params: sessionIdParamSchema }), authorizeOwnedSessionParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId } = getValidatedParams<SessionIdParam>(res);
  const data = await listSessionAttendance(teacherId, sessionId);

  res.json(data);
}));

sessionsRouter.post('/sessions/:sessionId/attendance/sync', validate({ params: sessionIdParamSchema }), authorizeOwnedSessionParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId } = getValidatedParams<SessionIdParam>(res);
  const result = await syncVoiceAttendanceForSession(teacherId, sessionId);

  res.json(result);
}));

sessionsRouter.put('/sessions/:sessionId/attendance/:studentId', validate({
  body: upsertAttendanceBodySchema,
  params: sessionStudentIdParamSchema,
}), authorizeOwnedSessionParam(), authorizeOwnedStudentParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId, studentId } = getValidatedParams<SessionStudentIdParam>(res);
  const body = getValidatedBody<UpsertAttendanceBody>(res);

  const attendance = await upsertSessionAttendance(teacherId, sessionId, studentId, {
    status: body.status,
    notes: body.notes,
  });

  res.json({ attendance });
}));

sessionsRouter.get('/attendance', validate({ query: attendanceListQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<AttendanceListQuery>(res);
  const records = await listAttendanceRecords(teacherId, query);

  res.json({ attendance: records });
}));

sessionsRouter.delete('/sessions/:sessionId/attendance', validate({ params: sessionIdParamSchema }), authorizeOwnedSessionParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId } = getValidatedParams<SessionIdParam>(res);
  await resetSessionAttendance(teacherId, sessionId);

  res.status(204).send();
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

sessionsRouter.use(handleServiceError);
