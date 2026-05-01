import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  createTeacherByAdminBodySchema,
  teacherIdParamSchema,
  updateTeacherByAdminBodySchema,
  type CreateTeacherByAdminBody,
  type TeacherIdParam,
  type UpdateTeacherByAdminBody,
} from '../schemas/admin.schemas.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, validate } from '../middlewares/validate.js';
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

adminRouter.get('/teachers', asyncHandler(async (_req, res) => {
  const teachers = await listTeachersForAdmin();
  res.json({ teachers });
}));

adminRouter.post('/teachers', validate({ body: createTeacherByAdminBodySchema }), asyncHandler(async (_req, res) => {
  const body = getValidatedBody<CreateTeacherByAdminBody>(res);
  const teacher = await createTeacherByAdmin(body);
  res.status(201).json({ teacher });
}));

adminRouter.patch('/teachers/:teacherId', validate({
  body: updateTeacherByAdminBodySchema,
  params: teacherIdParamSchema,
}), asyncHandler(async (req, res) => {
  const actorTeacherId = getActorTeacherId(req);
  const { teacherId } = getValidatedParams<TeacherIdParam>(res);
  const body = getValidatedBody<UpdateTeacherByAdminBody>(res);
  const teacher = await updateTeacherByAdmin(actorTeacherId, teacherId, body);
  res.json({ teacher });
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

adminRouter.use(handleServiceError);
