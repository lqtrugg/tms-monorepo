import { Router } from 'express';
import passport from 'passport';

import { TeacherRole } from '../../../../entities/enums.js';
import { adaptExpressRoute } from '../../../../shared/presentation/adapt-express-route.js';
import { validate } from '../../../../shared/middlewares/validate.js';
import { authorizeOwnedStudentParam, requireRoles } from '../../../identity/index.js';
import {
  studentIdParamSchema,
} from './student-report.schema.js';
import { StudentReportController } from '../controllers/StudentReportController.js';

type StudentReportRouteControllers = {
  getDashboardSummary: StudentReportController;
  getStudentLearningProfile: StudentReportController;
};

export function createStudentReportRouter(controllers: StudentReportRouteControllers): Router {
  const studentReportRouter = Router();

  studentReportRouter.use(passport.authenticate('jwt', { session: false }));
  studentReportRouter.use(requireRoles([TeacherRole.Teacher]));

  studentReportRouter.get('/reporting/dashboard', adaptExpressRoute(controllers.getDashboardSummary));

  studentReportRouter.get('/reporting/students/:studentId/learning-profile', validate({ params: studentIdParamSchema }), authorizeOwnedStudentParam(), adaptExpressRoute(controllers.getStudentLearningProfile));

  return studentReportRouter;
}
