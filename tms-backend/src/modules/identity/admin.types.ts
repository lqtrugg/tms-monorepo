import { TeacherRole } from '../../entities/index.js';

export type CreateTeacherByAdminInput = {
  username: string;
  password: string;
  role: TeacherRole;
  is_active: boolean;
  codeforces_handle: string | null;
  codeforces_api_key: string | null;
  codeforces_api_secret: string | null;
};

export type UpdateTeacherByAdminInput = {
  username?: string;
  password?: string;
  role?: TeacherRole;
  is_active?: boolean;
  codeforces_handle?: string | null;
  codeforces_api_key?: string | null;
  codeforces_api_secret?: string | null;
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
