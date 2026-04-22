import bcrypt from 'bcrypt';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

import config from '../config.js';
import { AppDataSource } from '../data-source.js';
import { Teacher } from '../entities/index.js';
import { AuthError } from '../errors/auth.error.js';
import { isUniqueViolation, normalizeCredentials, toAuthTeacher } from '../helpers/auth.helpers.js';
import type { AuthCredentials, AuthTeacher, AuthTokenPayload, AuthTokenResponse } from '../types/auth.types.js';

function teacherRepository() {
  return AppDataSource.getRepository(Teacher);
}

function signAccessToken(teacher: Teacher): string {
  const payload: AuthTokenPayload = {
    sub: teacher.id,
    username: teacher.username,
  };

  const signOptions: SignOptions = {
    expiresIn: config.auth.jwtExpiresIn as SignOptions['expiresIn'],
    issuer: config.auth.jwtIssuer,
    audience: config.auth.jwtAudience,
  };

  return jwt.sign(payload, config.auth.jwtSecret as Secret, signOptions);
}

export async function register(input: AuthCredentials): Promise<AuthTokenResponse> {
  const { username, password } = normalizeCredentials(input);
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptSaltRounds);

  const teacher = teacherRepository().create({
    username,
    password_hash: passwordHash,
  });

  try {
    const savedTeacher = await teacherRepository().save(teacher);

    return {
      accessToken: signAccessToken(savedTeacher),
      tokenType: 'Bearer',
      expiresIn: config.auth.jwtExpiresIn,
      teacher: toAuthTeacher(savedTeacher),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthError('username already exists', 409);
    }

    throw error;
  }
}

export async function login(input: AuthCredentials): Promise<AuthTokenResponse> {
  const { username, password } = normalizeCredentials(input);
  const teacher = await teacherRepository().findOneBy({ username });

  if (!teacher) {
    throw new AuthError('invalid username or password', 401);
  }

  const passwordMatches = await bcrypt.compare(password, teacher.password_hash);
  if (!passwordMatches) {
    throw new AuthError('invalid username or password', 401);
  }

  return {
    accessToken: signAccessToken(teacher),
    tokenType: 'Bearer',
    expiresIn: config.auth.jwtExpiresIn,
    teacher: toAuthTeacher(teacher),
  };
}

export function me(teacher: Teacher): AuthTeacher {
  return toAuthTeacher(teacher);
}
