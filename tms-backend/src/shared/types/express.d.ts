import type { DbContext } from '../../infrastructure/database/db-context.js';
import type { Teacher } from '../../modules/identity/domain/teacher.entity.js';

declare global {
  namespace Express {
    interface User extends Teacher {}

    interface Request {
      dbContext: DbContext;
    }
  }
}

export {};
