import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';
import { QueryFailedError } from 'typeorm';

import { Teacher, TeacherRole } from '../../entities/index.js';
import { ClassServiceError } from '../../shared/errors/class.error.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  classIdParamSchema,
  classListQuerySchema,
  classScheduleBodySchema,
  classScheduleParamSchema,
  createClassBodySchema,
  createManualSessionBodySchema,
  sessionIdParamSchema,
  sessionListQuerySchema,
  updateClassBodySchema,
  updateClassScheduleBodySchema,
  type ClassIdParam,
  type ClassListQuery,
  type ClassScheduleParam,
  type CreateClassBody,
  type CreateClassScheduleBody,
  type CreateManualSessionBody,
  type SessionIdParam,
  type SessionListQuery,
  type UpdateClassBody,
  type UpdateClassScheduleBody,
} from './classroom.schemas.js';
import { asyncHandler } from '../../shared/middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../../shared/middlewares/validate.js';
import { ClassroomService } from './classroom.service.js';
import {
  authorizeOwnedClassParam,
  authorizeOwnedClassQuery,
  authorizeOwnedSessionParam,
  requireRoles,
} from '../identity/index.js';

export const classRouter = Router();
const classroomService = new ClassroomService();

classRouter.use(passport.authenticate('jwt', { session: false }));
classRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ClassServiceError('unauthorized', 401);
  }

  return teacher.id;
}

function handleClassError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ClassServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as { code?: string; message?: string } | undefined;

    if (driverError?.code === '23514' || driverError?.code === '23505') {
      res.status(409).json({ error: driverError.message ?? 'database constraint violation' });
      return;
    }
  }

  next(error);
}

classRouter.get('/classes', validate({ query: classListQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const filters = getValidatedQuery<ClassListQuery>(res);
  const classes = await classroomService.listClasses(teacherId, filters);

  res.json({ classes });
}));

classRouter.post('/classes', validate({ body: createClassBodySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<CreateClassBody>(res);
  const classEntity = await classroomService.createClass(teacherId, payload);

  res.status(201).json({ class: classEntity });
}));

classRouter.get('/classes/:classId', validate({ params: classIdParamSchema }), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const classEntity = await classroomService.getClassById(teacherId, classId);

  res.json({ class: classEntity });
}));

classRouter.patch('/classes/:classId', validate({
  body: updateClassBodySchema,
  params: classIdParamSchema,
}), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const payload = getValidatedBody<UpdateClassBody>(res);
  const classEntity = await classroomService.updateClass(teacherId, classId, payload);

  res.json({ class: classEntity });
}));

const handleArchiveClass = asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const classEntity = await classroomService.archiveClass(teacherId, classId);

  res.json({ class: classEntity });
});

classRouter.post('/classes/:classId/archive', validate({ params: classIdParamSchema }), authorizeOwnedClassParam(), handleArchiveClass);
classRouter.post('/classes/:classId/close', validate({ params: classIdParamSchema }), authorizeOwnedClassParam(), handleArchiveClass);

classRouter.get('/classes/:classId/schedules', validate({ params: classIdParamSchema }), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const schedules = await classroomService.listClassSchedules(teacherId, classId);

  res.json({ schedules });
}));

classRouter.post('/classes/:classId/schedules', validate({
  body: classScheduleBodySchema,
  params: classIdParamSchema,
}), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const payload = getValidatedBody<CreateClassScheduleBody>(res);
  const result = await classroomService.createClassSchedule(teacherId, classId, payload);

  res.status(201).json(result);
}));

classRouter.patch('/classes/:classId/schedules/:scheduleId', validate({
  body: updateClassScheduleBodySchema,
  params: classScheduleParamSchema,
}), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId, scheduleId } = getValidatedParams<ClassScheduleParam>(res);
  const payload = getValidatedBody<UpdateClassScheduleBody>(res);
  const result = await classroomService.updateClassSchedule(teacherId, classId, scheduleId, payload);

  res.json(result);
}));

classRouter.delete('/classes/:classId/schedules/:scheduleId', validate({ params: classScheduleParamSchema }), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId, scheduleId } = getValidatedParams<ClassScheduleParam>(res);

  await classroomService.deleteClassSchedule(teacherId, classId, scheduleId);

  res.status(204).send();
}));

classRouter.get('/sessions', validate({ query: sessionListQuerySchema }), authorizeOwnedClassQuery(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const filters = getValidatedQuery<SessionListQuery>(res);
  const sessions = await classroomService.listSessions(teacherId, filters);

  res.json({ sessions });
}));

classRouter.get('/classes/:classId/sessions', validate({
  params: classIdParamSchema,
  query: sessionListQuerySchema,
}), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const filters = getValidatedQuery<SessionListQuery>(res);
  const sessions = await classroomService.listClassSessions(teacherId, classId, {
    status: filters.status,
    from: filters.from,
    to: filters.to,
  });

  res.json({ sessions });
}));

classRouter.post('/classes/:classId/sessions/manual', validate({
  body: createManualSessionBodySchema,
  params: classIdParamSchema,
}), authorizeOwnedClassParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { classId } = getValidatedParams<ClassIdParam>(res);
  const payload = getValidatedBody<CreateManualSessionBody>(res);
  const session = await classroomService.createManualSession(teacherId, classId, payload);

  res.status(201).json({ session });
}));

classRouter.post('/sessions/:sessionId/cancel', validate({ params: sessionIdParamSchema }), authorizeOwnedSessionParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { sessionId } = getValidatedParams<SessionIdParam>(res);
  const session = await classroomService.cancelSession(teacherId, sessionId);

  res.json({ session });
}));

classRouter.use(handleClassError);
