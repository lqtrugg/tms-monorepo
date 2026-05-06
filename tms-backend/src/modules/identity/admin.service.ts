import type { AdminTeacher, CreateTeacherByAdminInput, UpdateTeacherByAdminInput } from './admin.types.js';
import { identityService } from './identity.service.js';

export function listTeachersForAdmin(): Promise<AdminTeacher[]> {
  return identityService.listTeachersForAdmin();
}

export function createTeacherByAdmin(input: CreateTeacherByAdminInput): Promise<AdminTeacher> {
  return identityService.createTeacherByAdmin(input);
}

export function updateTeacherByAdmin(
  actorTeacherId: number,
  teacherId: number,
  input: UpdateTeacherByAdminInput,
): Promise<AdminTeacher> {
  return identityService.updateTeacherByAdmin(actorTeacherId, teacherId, input);
}

