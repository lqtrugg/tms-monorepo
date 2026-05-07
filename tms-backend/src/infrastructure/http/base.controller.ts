import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import type { DbContext } from '../database/db-context.js';
import type { Teacher } from '../../entities/teacher.entity.js';
import { DomainError } from '../../shared/errors/domain.error.js';

export abstract class BaseController {
  readonly router = Router();

  constructor() {
    this.router.use(passport.authenticate('jwt', { session: false }));
    this.initializeRoutes();
    this.router.use(this.handleError.bind(this));
  }

  protected abstract initializeRoutes(): void;

  protected getTeacher(req: Request): Teacher {
    const teacher = req.user as Teacher | undefined;
    if (!teacher) {
      throw new DomainError('unauthorized', 401, 'unauthorized');
    }

    return teacher;
  }

  protected getDbContext(req: Request): DbContext {
    return req.dbContext;
  }

  private handleError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
    if (error instanceof DomainError) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
      return;
    }

    next(error);
  }
}
