import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import { asyncHandler } from '../../../shared/middlewares/async-handler.js';
import { getValidatedParams, validate } from '../../../shared/middlewares/validate.js';
import { requireRoles } from '../../identity/index.js';
import {
  studentIdParamSchema,
  type StudentIdParam,
} from './academic-report.schemas.js';
import {
  getDashboardSummary,
  getStudentLearningProfile,
} from './academic-report.service.js';

export const academicReportRouter = Router();

academicReportRouter.use(passport.authenticate('jwt', { session: false }));
academicReportRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

academicReportRouter.get('/reporting/dashboard', asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const summary = await getDashboardSummary(teacherId);

  res.json({ summary });
}));

academicReportRouter.get('/reporting/students/:studentId/learning-profile', validate({ params: studentIdParamSchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const profile = await getStudentLearningProfile(teacherId, studentId);

  res.json(profile);
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

academicReportRouter.use(handleServiceError);
