import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  asRecord,
  parseBoolean,
  parseDateTime,
  parseIntegerArrayFromQuery,
  parsePositiveInteger,
} from '../helpers/service.helpers.js';
import {
  getDashboardSummary,
  getIncomeReport,
  getStudentLearningProfile,
} from '../services/reporting.service.js';

export const reportingRouter = Router();

reportingRouter.use(passport.authenticate('jwt', { session: false }));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

reportingRouter.get('/reporting/dashboard', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const summary = await getDashboardSummary(teacherId);

    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

reportingRouter.get('/reporting/income', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const report = await getIncomeReport(teacherId, {
      from: query.from === undefined ? undefined : parseDateTime(query.from, 'from'),
      to: query.to === undefined ? undefined : parseDateTime(query.to, 'to'),
      class_ids: parseIntegerArrayFromQuery(query.class_ids, 'class_ids'),
      include_unpaid: query.include_unpaid === undefined
        ? undefined
        : parseBoolean(query.include_unpaid, 'include_unpaid'),
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

reportingRouter.get('/reporting/students/:studentId/learning-profile', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parsePositiveInteger(req.params.studentId, 'student_id');
    const profile = await getStudentLearningProfile(teacherId, studentId);

    res.json(profile);
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

reportingRouter.use(handleServiceError);
