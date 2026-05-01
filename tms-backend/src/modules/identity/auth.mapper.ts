import { Teacher } from '../../entities/index.js';
import type { AuthTeacher } from './auth.types.js';

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
