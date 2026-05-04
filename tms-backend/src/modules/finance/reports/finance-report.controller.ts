import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import { asyncHandler } from '../../../shared/middlewares/async-handler.js';
import { getValidatedQuery, validate } from '../../../shared/middlewares/validate.js';
import { requireRoles } from '../../identity/index.js';
import {
  incomeReportQuerySchema,
  type IncomeReportQuery,
} from './finance-report.schemas.js';
import { getIncomeReport } from './finance-report.service.js';

export const financeReportRouter = Router();

financeReportRouter.use(passport.authenticate('jwt', { session: false }));
financeReportRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

financeReportRouter.get('/reporting/income', validate({ query: incomeReportQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<IncomeReportQuery>(res);
  const report = await getIncomeReport(teacherId, query);

  res.json(report);
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

financeReportRouter.use(handleServiceError);
