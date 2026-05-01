import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  incomeReportQuerySchema,
  studentIdParamSchema,
  type IncomeReportQuery,
  type StudentIdParam,
} from '../schemas/reporting.schemas.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getValidatedParams, getValidatedQuery, validate } from '../middlewares/validate.js';
import {
  getDashboardSummary,
  getIncomeReport,
  getStudentLearningProfile,
} from '../services/reporting.service.js';
import { requireRoles } from '../services/auth.rbac.js';

export const reportingRouter = Router();

reportingRouter.use(passport.authenticate('jwt', { session: false }));
reportingRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

reportingRouter.get('/reporting/dashboard', asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const summary = await getDashboardSummary(teacherId);

  res.json({ summary });
}));

reportingRouter.get('/reporting/income', validate({ query: incomeReportQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<IncomeReportQuery>(res);
  const report = await getIncomeReport(teacherId, query);

  res.json(report);
}));

reportingRouter.get('/reporting/students/:studentId/learning-profile', validate({ params: studentIdParamSchema }), asyncHandler(async (req, res) => {
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

reportingRouter.use(handleServiceError);
