import { Teacher } from '../entities/index.js';
import { AuthError } from '../errors/auth.error.js';
import type { AuthCredentials, AuthTeacher } from '../types/auth.types.js';

export function normalizeCredentials(input: AuthCredentials): { username: string; password: string } {
  if (typeof input.username !== 'string' || typeof input.password !== 'string') {
    throw new AuthError('username and password are required', 400);
  }

  const username = input.username.trim();
  const password = input.password;

  if (!username || !password) {
    throw new AuthError('username and password are required', 400);
  }

  return { username, password };
}

export function toAuthTeacher(teacher: Teacher): AuthTeacher {
  return {
    id: teacher.id,
    username: teacher.username,
    created_at: teacher.created_at,
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
