import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import { parsePositiveInteger } from '../helpers/service.helpers.js';
import { requireRoles } from '../services/auth.rbac.js';
import { createTeacherByAdmin, listTeachersForAdmin, updateTeacherByAdmin } from '../services/admin.service.js';

export const adminRouter = Router();

adminRouter.use(passport.authenticate('jwt', { session: false }));
adminRouter.use(requireRoles([TeacherRole.SysAdmin]));

function getActorTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

adminRouter.get('/teachers', async (_req, res, next) => {
  try {
    const teachers = await listTeachersForAdmin();
    res.json({ teachers });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/teachers', async (req, res, next) => {
  try {
    const teacher = await createTeacherByAdmin(req.body);
    res.status(201).json({ teacher });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/teachers/:teacherId', async (req, res, next) => {
  try {
    const actorTeacherId = getActorTeacherId(req);
    const teacherId = parsePositiveInteger(req.params.teacherId, 'teacher_id');
    const teacher = await updateTeacherByAdmin(actorTeacherId, teacherId, req.body);
    res.json({ teacher });
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

adminRouter.use(handleServiceError);
