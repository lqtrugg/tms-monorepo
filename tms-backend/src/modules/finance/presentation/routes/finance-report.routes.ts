import { Router } from 'express';
import passport from 'passport';

import { TeacherRole } from '../../../../entities/enums.js';
import { validate } from '../../../../shared/middlewares/validate.js';
import { adaptExpressRoute } from '../../../../shared/presentation/adapt-express-route.js';
import { requireRoles } from '../../../identity/index.js';
import { FinanceReportController } from '../controllers/FinanceReportController.js';
import { incomeReportQuerySchema } from './finance-report.schema.js';

export function createFinanceReportRouter(controller: FinanceReportController): Router {
  const router = Router();

  router.use(passport.authenticate('jwt', { session: false }));
  router.use(requireRoles([TeacherRole.Teacher]));

  router.get(
    '/reporting/income',
    validate({ query: incomeReportQuerySchema }),
    adaptExpressRoute(controller),
  );

  return router;
}
