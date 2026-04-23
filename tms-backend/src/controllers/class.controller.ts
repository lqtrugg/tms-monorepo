import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ClassServiceError } from '../errors/class.error.js';
import {
  parseClassListFilters,
  parseCreateClassInput,
  parseCreateClassScheduleInput,
  parseCreateManualSessionInput,
  parseIdParam,
  parseSessionListFilters,
  parseUpdateClassInput,
  parseUpdateClassScheduleInput,
  parseUpsertCodeforcesGroupInput,
} from '../helpers/class.helpers.js';
import {
  archiveClass,
  cancelSession,
  createClass,
  createClassSchedule,
  createManualSession,
  deleteClassSchedule,
  getClassById,
  getCodeforcesGroup,
  listClasses,
  listClassSchedules,
  listClassSessions,
  listSessions,
  removeCodeforcesGroup,
  updateClass,
  updateClassSchedule,
  upsertCodeforcesGroup,
} from '../services/class.service.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';

export const classRouter = Router();

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

  next(error);
}

classRouter.get('/classes', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const filters = parseClassListFilters(req.query);
    const classes = await listClasses(teacherId, filters);

    res.json({ classes });
  } catch (error) {
    next(error);
  }
});

classRouter.post('/classes', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const payload = parseCreateClassInput(req.body);
    const classEntity = await createClass(teacherId, payload);

    res.status(201).json({ class: classEntity });
  } catch (error) {
    next(error);
  }
});

classRouter.get('/classes/:classId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const classEntity = await getClassById(teacherId, classId);

    res.json({ class: classEntity });
  } catch (error) {
    next(error);
  }
});

classRouter.patch('/classes/:classId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const payload = parseUpdateClassInput(req.body);
    const classEntity = await updateClass(teacherId, classId, payload);

    res.json({ class: classEntity });
  } catch (error) {
    next(error);
  }
});

async function handleArchiveClass(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const classEntity = await archiveClass(teacherId, classId);

    res.json({ class: classEntity });
  } catch (error) {
    next(error);
  }
}

classRouter.post('/classes/:classId/archive', handleArchiveClass);
classRouter.post('/classes/:classId/close', handleArchiveClass);

classRouter.get('/classes/:classId/schedules', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const schedules = await listClassSchedules(teacherId, classId);

    res.json({ schedules });
  } catch (error) {
    next(error);
  }
});

classRouter.post('/classes/:classId/schedules', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const payload = parseCreateClassScheduleInput(req.body);
    const result = await createClassSchedule(teacherId, classId, payload);

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

classRouter.patch('/classes/:classId/schedules/:scheduleId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const scheduleId = parseIdParam(req.params.scheduleId, 'schedule_id');
    const payload = parseUpdateClassScheduleInput(req.body);
    const result = await updateClassSchedule(teacherId, classId, scheduleId, payload);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

classRouter.delete('/classes/:classId/schedules/:scheduleId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const scheduleId = parseIdParam(req.params.scheduleId, 'schedule_id');

    await deleteClassSchedule(teacherId, classId, scheduleId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

classRouter.get('/sessions', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const filters = parseSessionListFilters(req.query);
    const sessions = await listSessions(teacherId, filters);

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

classRouter.get('/classes/:classId/sessions', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const filters = parseSessionListFilters(req.query);
    const sessions = await listClassSessions(teacherId, classId, {
      status: filters.status,
      from: filters.from,
      to: filters.to,
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

classRouter.post('/classes/:classId/sessions/manual', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const payload = parseCreateManualSessionInput(req.body);
    const session = await createManualSession(teacherId, classId, payload);

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

classRouter.post('/sessions/:sessionId/cancel', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const sessionId = parseIdParam(req.params.sessionId, 'session_id');
    const session = await cancelSession(teacherId, sessionId);

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

classRouter.get('/classes/:classId/codeforces-group', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const group = await getCodeforcesGroup(teacherId, classId);

    res.json({ codeforces_group: group });
  } catch (error) {
    next(error);
  }
});

classRouter.put('/classes/:classId/codeforces-group', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const payload = parseUpsertCodeforcesGroupInput(req.body);
    const group = await upsertCodeforcesGroup(teacherId, classId, payload);

    res.json({ codeforces_group: group });
  } catch (error) {
    next(error);
  }
});

classRouter.delete('/classes/:classId/codeforces-group', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const classId = parseIdParam(req.params.classId, 'class_id');
    const removed = await removeCodeforcesGroup(teacherId, classId);

    res.json({ removed });
  } catch (error) {
    next(error);
  }
});

classRouter.use(handleClassError);
