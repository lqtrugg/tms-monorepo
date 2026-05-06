import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import { asyncHandler } from '../../../shared/middlewares/async-handler.js';
import { getValidatedParams, validate } from '../../../shared/middlewares/validate.js';
import { authorizeOwnedTopicParam, requireRoles } from '../../identity/index.js';
import { topicIdParamSchema, type TopicIdParam } from '../topic.schemas.js';
import { getTopicStandingMatrix } from './topic-standing-report.service.js';

export const topicStandingReportRouter = Router();

topicStandingReportRouter.use(passport.authenticate('jwt', { session: false }));
topicStandingReportRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;
  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

topicStandingReportRouter.get('/topics/:topicId/standing', validate({ params: topicIdParamSchema }), authorizeOwnedTopicParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { topicId } = getValidatedParams<TopicIdParam>(res);
  const matrix = await getTopicStandingMatrix(teacherId, topicId);

  res.json(matrix);
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

topicStandingReportRouter.use(handleServiceError);
