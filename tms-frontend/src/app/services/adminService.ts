import { apiRequest } from "./apiClient";
import type { TeacherRole } from "./authService";

export interface BackendAdminTeacher {
  id: number;
  username: string;
  role: TeacherRole;
  is_active: boolean;
  codeforces_handle: string | null;
  has_codeforces_api_key: boolean;
  has_codeforces_api_secret: boolean;
  created_at: string;
}

export async function listTeachersForAdmin(): Promise<BackendAdminTeacher[]> {
  const data = await apiRequest<{ teachers: BackendAdminTeacher[] }>("/admin/teachers");
  return data.teachers;
}

export async function createTeacherByAdmin(payload: {
  username: string;
  password: string;
  role?: TeacherRole;
  is_active?: boolean;
  codeforces_handle?: string | null;
  codeforces_api_key?: string | null;
  codeforces_api_secret?: string | null;
}): Promise<BackendAdminTeacher> {
  const data = await apiRequest<{ teacher: BackendAdminTeacher }>("/admin/teachers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.teacher;
}

export async function updateTeacherByAdmin(
  teacherId: number,
  payload: {
    username?: string;
    password?: string;
    role?: TeacherRole;
    is_active?: boolean;
    codeforces_handle?: string | null;
    codeforces_api_key?: string | null;
    codeforces_api_secret?: string | null;
  },
): Promise<BackendAdminTeacher> {
  const data = await apiRequest<{ teacher: BackendAdminTeacher }>(`/admin/teachers/${teacherId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.teacher;
}
