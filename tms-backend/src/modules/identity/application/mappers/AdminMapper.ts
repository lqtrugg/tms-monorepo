import { Teacher } from '../../../../entities/index.js';
import type { AdminTeacher } from '../dto/AdminDto.js';

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
