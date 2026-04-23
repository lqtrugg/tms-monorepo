import bcrypt from 'bcrypt';

import config from '../config.js';
import { AppDataSource } from '../data-source.js';
import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  normalizeCreateTeacherByAdminInput,
  normalizeUpdateTeacherByAdminInput,
  toAdminTeacher,
} from '../helpers/admin.helpers.js';
import { isUniqueViolation } from '../helpers/auth.helpers.js';
import type { AdminTeacher, CreateTeacherByAdminInput, UpdateTeacherByAdminInput } from '../types/admin.types.js';

function teacherRepository() {
  return AppDataSource.getRepository(Teacher);
}

export async function listTeachersForAdmin(): Promise<AdminTeacher[]> {
  const teachers = await teacherRepository().find({
    order: {
      created_at: 'DESC',
    },
  });

  return teachers.map(toAdminTeacher);
}

export async function createTeacherByAdmin(input: CreateTeacherByAdminInput): Promise<AdminTeacher> {
  const payload = normalizeCreateTeacherByAdminInput(input);
  const passwordHash = await bcrypt.hash(payload.password, config.auth.bcryptSaltRounds);

  const teacher = teacherRepository().create({
    username: payload.username,
    password_hash: passwordHash,
    role: payload.role,
    is_active: payload.is_active,
    codeforces_handle: payload.codeforces_handle,
    codeforces_api_key: payload.codeforces_api_key,
    codeforces_api_secret: payload.codeforces_api_secret,
  });

  try {
    const saved = await teacherRepository().save(teacher);
    return toAdminTeacher(saved);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError('username already exists', 409);
    }

    throw error;
  }
}

export async function updateTeacherByAdmin(
  actorTeacherId: number,
  teacherId: number,
  input: UpdateTeacherByAdminInput,
): Promise<AdminTeacher> {
  const patch = normalizeUpdateTeacherByAdminInput(input);
  const repository = teacherRepository();
  const teacher = await repository.findOneBy({ id: teacherId });

  if (!teacher) {
    throw new ServiceError('teacher not found', 404);
  }

  if (patch.role !== undefined) {
    if (actorTeacherId === teacher.id && patch.role !== TeacherRole.SysAdmin) {
      throw new ServiceError('cannot remove sysadmin role from current account', 409);
    }

    teacher.role = patch.role;
  }

  if (patch.is_active !== undefined) {
    if (actorTeacherId === teacher.id && !patch.is_active) {
      throw new ServiceError('cannot deactivate current account', 409);
    }

    teacher.is_active = patch.is_active;
  }

  if (patch.username !== undefined) {
    teacher.username = patch.username;
  }

  if (patch.password !== undefined) {
    teacher.password_hash = await bcrypt.hash(patch.password, config.auth.bcryptSaltRounds);
  }

  if (patch.codeforces_handle !== undefined) {
    teacher.codeforces_handle = patch.codeforces_handle;
  }

  if (patch.codeforces_api_key !== undefined) {
    teacher.codeforces_api_key = patch.codeforces_api_key;
  }

  if (patch.codeforces_api_secret !== undefined) {
    teacher.codeforces_api_secret = patch.codeforces_api_secret;
  }

  try {
    const saved = await repository.save(teacher);
    return toAdminTeacher(saved);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ServiceError('username already exists', 409);
    }

    throw error;
  }
}
