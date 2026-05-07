import { Router } from 'express';
import passport from 'passport';

import { TeacherRole } from '../../../../entities/enums.js';
import { validate } from '../../../../shared/middlewares/validate.js';
import { adaptExpressRoute } from '../../../../shared/presentation/adapt-express-route.js';
import { authorizeOwnedClassBody, authorizeOwnedClassParam, requireRoles } from '../../../identity/index.js';
import { MessagingController } from '../controllers/MessagingController.js';
import {
  bulkDmBodySchema,
  channelPostBodySchema,
  classIdParamSchema,
  messageListQuerySchema,
  upsertDiscordServerBodySchema,
} from './messaging.schema.js';

type MessagingRouteControllers = {
  listDiscordServers: MessagingController;
  upsertDiscordServer: MessagingController;
  deleteDiscordServer: MessagingController;
  listMessages: MessagingController;
  sendBulkDm: MessagingController;
  sendChannelPost: MessagingController;
};

export function createMessagingRouter(controllers: MessagingRouteControllers): Router {
  const router = Router();

  router.use(passport.authenticate('jwt', { session: false }));
  router.use(requireRoles([TeacherRole.Teacher]));

  router.get('/discord/servers', adaptExpressRoute(controllers.listDiscordServers));
  router.put(
    '/classes/:classId/discord-server',
    validate({ params: classIdParamSchema, body: upsertDiscordServerBodySchema }),
    authorizeOwnedClassParam(),
    adaptExpressRoute(controllers.upsertDiscordServer),
  );
  router.delete(
    '/classes/:classId/discord-server',
    validate({ params: classIdParamSchema }),
    authorizeOwnedClassParam(),
    adaptExpressRoute(controllers.deleteDiscordServer),
  );
  router.get(
    '/discord/messages',
    validate({ query: messageListQuerySchema }),
    adaptExpressRoute(controllers.listMessages),
  );
  router.post(
    '/discord/messages/bulk-dm',
    validate({ body: bulkDmBodySchema }),
    authorizeOwnedClassBody('class_id'),
    adaptExpressRoute(controllers.sendBulkDm),
  );
  router.post(
    '/discord/messages/channel-post',
    validate({ body: channelPostBodySchema }),
    adaptExpressRoute(controllers.sendChannelPost),
  );

  return router;
}
