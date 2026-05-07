import { Router } from 'express';
import passport from 'passport';

import { TeacherRole } from '../../../../entities/enums.js';
import { adaptExpressRoute } from '../../../../shared/presentation/adapt-express-route.js';
import { validate } from '../../../../shared/middlewares/validate.js';
import { authorizeOwnedClassParam, requireRoles } from '../../../identity/index.js';
import {
  classIdParamSchema,
  classScheduleBodySchema,
  classScheduleParamSchema,
  updateClassScheduleBodySchema,
} from './classroom.schema.js';
import { ClassScheduleController } from '../controllers/ClassScheduleController.js';

type ScheduleRouteControllers = {
  listClassSchedules: ClassScheduleController;
  createClassSchedule: ClassScheduleController;
  updateClassSchedule: ClassScheduleController;
  deleteClassSchedule: ClassScheduleController;
};

export function createClassScheduleRouter(controllers: ScheduleRouteControllers): Router {
  const router = Router();

  router.use(passport.authenticate('jwt', { session: false }));
  router.use(requireRoles([TeacherRole.Teacher]));

  router.get('/classes/:classId/schedules', validate({ params: classIdParamSchema }), authorizeOwnedClassParam(), adaptExpressRoute(controllers.listClassSchedules));
  router.post('/classes/:classId/schedules', validate({
    body: classScheduleBodySchema,
    params: classIdParamSchema,
  }), authorizeOwnedClassParam(), adaptExpressRoute(controllers.createClassSchedule));
  router.patch('/classes/:classId/schedules/:scheduleId', validate({
    body: updateClassScheduleBodySchema,
    params: classScheduleParamSchema,
  }), authorizeOwnedClassParam(), adaptExpressRoute(controllers.updateClassSchedule));
  router.delete('/classes/:classId/schedules/:scheduleId', validate({ params: classScheduleParamSchema }), authorizeOwnedClassParam(), adaptExpressRoute(controllers.deleteClassSchedule));

  return router;
}
