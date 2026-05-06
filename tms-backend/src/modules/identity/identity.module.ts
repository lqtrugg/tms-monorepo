import type { AppModule } from '../module.types.js';
import { Teacher } from './domain/teacher.entity.js';
import { adminRouter, authRouter } from './index.js';

export const identityModule: AppModule = {
  name: 'identity',
  entities: [Teacher],
  routes: [
    { path: '/', router: authRouter },
    { path: '/admin', router: adminRouter },
  ],
};
