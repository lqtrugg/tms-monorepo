import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher } from '../entities/index.js';
import { AuthError } from '../errors/auth.error.js';
import { login, me, register, updateMe } from '../services/auth.service.js';

export const authRouter = Router();

function handleAuthError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const authResponse = await register(req.body);
    res.status(201).json(authResponse);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const authResponse = await login(req.body);
    res.json(authResponse);
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ teacher: me(req.user as Teacher) });
});

authRouter.patch('/me', passport.authenticate('jwt', { session: false }), async (req, res, next) => {
  try {
    const teacher = req.user as Teacher;
    const updatedTeacher = await updateMe(teacher.id, req.body);
    res.json({ teacher: updatedTeacher });
  } catch (error) {
    next(error);
  }
});

authRouter.use(handleAuthError);
