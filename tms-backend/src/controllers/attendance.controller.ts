import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  attendanceListQuerySchema,
  sessionIdParamSchema,
  sessionStudentIdParamSchema,
  upsertAttendanceBodySchema,
  type AttendanceListQuery,
  type SessionIdParam,
  type SessionStudentIdParam,
  type UpsertAttendanceBody,
} from '../schemas/attendance.schemas.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../middlewares/validate.js';
import { requireRoles } from '../services/auth.rbac.js';
import {
  listAttendanceRecords,
  listSessionAttendance,
  resetSessionAttendance,
  upsertSessionAttendance,
} from '../services/attendance.service.js';
import { syncVoiceAttendanceForSession } from '../services/voice-attendance-sync.service.js';

export const attendanceRouter = Router();

attendanceRouter.use(passport.authenticate('jwt', { session: false }));
attendanceRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

attendanceRouter.get('/sessions/:sessionId/attendance', validate({ params: sessionIdParamSchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId } = getValidatedParams<SessionIdParam>(res);
  const data = await listSessionAttendance(teacherId, sessionId);

  res.json(data);
}));

attendanceRouter.post('/sessions/:sessionId/attendance/sync', validate({ params: sessionIdParamSchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId } = getValidatedParams<SessionIdParam>(res);
  const result = await syncVoiceAttendanceForSession(teacherId, sessionId);

  res.json(result);
}));

attendanceRouter.put('/sessions/:sessionId/attendance/:studentId', validate({
  body: upsertAttendanceBodySchema,
  params: sessionStudentIdParamSchema,
}), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId, studentId } = getValidatedParams<SessionStudentIdParam>(res);
  const body = getValidatedBody<UpsertAttendanceBody>(res);

  const attendance = await upsertSessionAttendance(teacherId, sessionId, studentId, {
    status: body.status,
    notes: body.notes,
  });

  res.json({ attendance });
}));

attendanceRouter.get('/attendance', validate({ query: attendanceListQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<AttendanceListQuery>(res);
  const records = await listAttendanceRecords(teacherId, query);

  res.json({ attendance: records });
}));

attendanceRouter.delete('/sessions/:sessionId/attendance', validate({ params: sessionIdParamSchema }), asyncHandler(async (req, res) => {
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

attendanceRouter.use(handleServiceError);
