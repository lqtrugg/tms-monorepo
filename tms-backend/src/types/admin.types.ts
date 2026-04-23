import { TeacherRole } from '../entities/index.js';

export type CreateTeacherByAdminInput = {
  username: unknown;
  password: unknown;
  role?: unknown;
  is_active?: unknown;
  codeforces_handle?: unknown;
  codeforces_api_key?: unknown;
  codeforces_api_secret?: unknown;
};

export type UpdateTeacherByAdminInput = {
  username?: unknown;
  password?: unknown;
  role?: unknown;
  is_active?: unknown;
  codeforces_handle?: unknown;
  codeforces_api_key?: unknown;
  codeforces_api_secret?: unknown;
};

export type AdminTeacher = {
  id: number;
  username: string;
  role: TeacherRole;
  is_active: boolean;
  codeforces_handle: string | null;
  has_codeforces_api_key: boolean;
  has_codeforces_api_secret: boolean;
  created_at: Date;
};
