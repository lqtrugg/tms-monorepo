import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher } from '../entities/index.js';
import { AuthError } from '../errors/auth.error.js';
import { ServiceError } from '../errors/service.error.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getValidatedBody, validate } from '../middlewares/validate.js';
import {
  loginBodySchema,
  registerBodySchema,
  updateMeBodySchema,
  type LoginBody,
  type RegisterBody,
  type UpdateMeBody,
} from '../schemas/auth.schemas.js';
import { login, me, register, updateMe } from '../services/auth.service.js';

export const authRouter = Router();

function handleAuthError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

authRouter.post('/register', validate({ body: registerBodySchema }), asyncHandler(async (_req, res) => {
  const body = getValidatedBody<RegisterBody>(res);
  const authResponse = await register(body);
  res.status(201).json(authResponse);
}));

authRouter.post('/login', validate({ body: loginBodySchema }), asyncHandler(async (_req, res) => {
  const body = getValidatedBody<LoginBody>(res);
  const authResponse = await login(body);
  res.json(authResponse);
}));

authRouter.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json({ teacher: me(req.user as Teacher) });
});

authRouter.patch('/me', passport.authenticate('jwt', { session: false }), validate({ body: updateMeBodySchema }), asyncHandler(async (req, res) => {
  const teacher = req.user as Teacher;
  const body = getValidatedBody<UpdateMeBody>(res);
  const updatedTeacher = await updateMe(teacher.id, body);
  res.json({ teacher: updatedTeacher });
}));

authRouter.use(handleAuthError);
