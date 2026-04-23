import { Teacher } from '../entities/index.js';
import { AuthError } from '../errors/auth.error.js';
import type { AuthTeacher, LoginInput, RegisterInput, UpdateTeacherInput } from '../types/auth.types.js';

function normalizeOptionalString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new AuthError(`${fieldName} must be a string`, 400);
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeLoginInput(input: LoginInput): { username: string; password: string } {
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

export function normalizeRegisterInput(input: RegisterInput): {
  username: string;
  password: string;
  codeforces_handle: string | null;
  codeforces_api_key: string | null;
  codeforces_api_secret: string | null;
} {
  const { username, password } = normalizeLoginInput(input);

  return {
    username,
    password,
    codeforces_handle: normalizeOptionalString(input.codeforces_handle, 'codeforces_handle'),
    codeforces_api_key: normalizeOptionalString(input.codeforces_api_key, 'codeforces_api_key'),
    codeforces_api_secret: normalizeOptionalString(input.codeforces_api_secret, 'codeforces_api_secret'),
  };
}

export function normalizeUpdateTeacherInput(input: UpdateTeacherInput): {
  username?: string;
  password?: string;
  codeforces_handle?: string | null;
  codeforces_api_key?: string | null;
  codeforces_api_secret?: string | null;
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new AuthError('body must be an object', 400);
  }

  const patch: {
    username?: string;
    password?: string;
    codeforces_handle?: string | null;
    codeforces_api_key?: string | null;
    codeforces_api_secret?: string | null;
  } = {};

  if (input.username !== undefined) {
    if (typeof input.username !== 'string') {
      throw new AuthError('username must be a string', 400);
    }

    const username = input.username.trim();
    if (!username) {
      throw new AuthError('username cannot be empty', 400);
    }

    patch.username = username;
  }

  if (input.password !== undefined) {
    if (typeof input.password !== 'string') {
      throw new AuthError('password must be a string', 400);
    }

    if (!input.password) {
      throw new AuthError('password cannot be empty', 400);
    }

    patch.password = input.password;
  }

  if (input.codeforces_handle !== undefined) {
    patch.codeforces_handle = normalizeOptionalString(input.codeforces_handle, 'codeforces_handle');
  }

  if (input.codeforces_api_key !== undefined) {
    patch.codeforces_api_key = normalizeOptionalString(input.codeforces_api_key, 'codeforces_api_key');
  }

  if (input.codeforces_api_secret !== undefined) {
    patch.codeforces_api_secret = normalizeOptionalString(input.codeforces_api_secret, 'codeforces_api_secret');
  }

  if (Object.keys(patch).length === 0) {
    throw new AuthError('at least one field is required', 400);
  }

  return patch;
}

export function toAuthTeacher(teacher: Teacher): AuthTeacher {
  return {
    id: teacher.id,
    username: teacher.username,
    role: teacher.role,
    is_active: teacher.is_active,
    codeforces_handle: teacher.codeforces_handle,
    codeforces_api_key: teacher.codeforces_api_key,
    codeforces_api_secret: teacher.codeforces_api_secret,
    created_at: teacher.created_at,
  };
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
