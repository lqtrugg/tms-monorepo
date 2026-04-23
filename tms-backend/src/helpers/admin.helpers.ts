import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import type {
  AdminTeacher,
  CreateTeacherByAdminInput,
  UpdateTeacherByAdminInput,
} from '../types/admin.types.js';

function normalizeOptionalString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ServiceError(`${fieldName} must be a string`, 400);
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ServiceError(`${fieldName} is required`, 400);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new ServiceError(`${fieldName} is required`, 400);
  }

  return normalized;
}

function normalizeTeacherRole(value: unknown, fieldName: string): TeacherRole {
  if (value === TeacherRole.SysAdmin || value === TeacherRole.Teacher) {
    return value;
  }

  throw new ServiceError(`${fieldName} must be one of: ${TeacherRole.SysAdmin}, ${TeacherRole.Teacher}`, 400);
}

function normalizeBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new ServiceError(`${fieldName} must be a boolean`, 400);
}

export function normalizeCreateTeacherByAdminInput(input: CreateTeacherByAdminInput): {
  username: string;
  password: string;
  role: TeacherRole;
  is_active: boolean;
  codeforces_handle: string | null;
  codeforces_api_key: string | null;
  codeforces_api_secret: string | null;
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ServiceError('body must be an object', 400);
  }

  const username = normalizeRequiredString(input.username, 'username');
  const password = normalizeRequiredString(input.password, 'password');

  return {
    username,
    password,
    role: input.role === undefined ? TeacherRole.Teacher : normalizeTeacherRole(input.role, 'role'),
    is_active: input.is_active === undefined ? true : normalizeBoolean(input.is_active, 'is_active'),
    codeforces_handle: normalizeOptionalString(input.codeforces_handle, 'codeforces_handle'),
    codeforces_api_key: normalizeOptionalString(input.codeforces_api_key, 'codeforces_api_key'),
    codeforces_api_secret: normalizeOptionalString(input.codeforces_api_secret, 'codeforces_api_secret'),
  };
}

export function normalizeUpdateTeacherByAdminInput(input: UpdateTeacherByAdminInput): {
  username?: string;
  password?: string;
  role?: TeacherRole;
  is_active?: boolean;
  codeforces_handle?: string | null;
  codeforces_api_key?: string | null;
  codeforces_api_secret?: string | null;
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new ServiceError('body must be an object', 400);
  }

  const patch: {
    username?: string;
    password?: string;
    role?: TeacherRole;
    is_active?: boolean;
    codeforces_handle?: string | null;
    codeforces_api_key?: string | null;
    codeforces_api_secret?: string | null;
  } = {};

  if (input.username !== undefined) {
    patch.username = normalizeRequiredString(input.username, 'username');
  }

  if (input.password !== undefined) {
    patch.password = normalizeRequiredString(input.password, 'password');
  }

  if (input.role !== undefined) {
    patch.role = normalizeTeacherRole(input.role, 'role');
  }

  if (input.is_active !== undefined) {
    patch.is_active = normalizeBoolean(input.is_active, 'is_active');
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
    throw new ServiceError('at least one field is required', 400);
  }

  return patch;
}

export function toAdminTeacher(teacher: Teacher): AdminTeacher {
  return {
    id: teacher.id,
    username: teacher.username,
    role: teacher.role,
    is_active: teacher.is_active,
    codeforces_handle: teacher.codeforces_handle,
    has_codeforces_api_key: teacher.codeforces_api_key !== null,
    has_codeforces_api_secret: teacher.codeforces_api_secret !== null,
    created_at: teacher.created_at,
  };
}
