import { Router } from 'express';
import passport from 'passport';

import { validate } from '../../../../shared/middlewares/validate.js';
import { adaptExpressRoute } from '../../../../shared/presentation/adapt-express-route.js';
import { AuthController } from '../controllers/AuthController.js';
import { loginBodySchema, registerBodySchema, updateMeBodySchema } from './auth.schema.js';

type AuthRouteControllers = {
  register: AuthController;
  login: AuthController;
  me: AuthController;
  updateMe: AuthController;
};

export function createAuthRouter(controllers: AuthRouteControllers): Router {
  const router = Router();

  router.post('/register', validate({ body: registerBodySchema }), adaptExpressRoute(controllers.register));
  router.post('/login', validate({ body: loginBodySchema }), adaptExpressRoute(controllers.login));
  router.get('/me', passport.authenticate('jwt', { session: false }), adaptExpressRoute(controllers.me));
  router.patch(
    '/me',
    passport.authenticate('jwt', { session: false }),
    validate({ body: updateMeBodySchema }),
    adaptExpressRoute(controllers.updateMe),
  );

  return router;
}
