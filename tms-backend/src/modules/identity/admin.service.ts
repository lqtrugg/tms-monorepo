import bcrypt from 'bcrypt';

import config from '../../config.js';
import { AppDataSource } from '../../data-source.js';
import { Teacher, TeacherRole } from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import { toAdminTeacher } from './admin.mapper.js';
import { isUniqueViolation } from './auth.mapper.js';
import type { AdminTeacher, CreateTeacherByAdminInput, UpdateTeacherByAdminInput } from './admin.types.js';

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
  const passwordHash = await bcrypt.hash(input.password, config.auth.bcryptSaltRounds);

  const teacher = teacherRepository().create({
    username: input.username,
    password_hash: passwordHash,
    role: input.role ?? TeacherRole.Teacher,
    is_active: input.is_active ?? true,
    codeforces_handle: input.codeforces_handle,
    codeforces_api_key: input.codeforces_api_key,
    codeforces_api_secret: input.codeforces_api_secret,
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
  const repository = teacherRepository();
  const teacher = await repository.findOneBy({ id: teacherId });

  if (!teacher) {
    throw new ServiceError('teacher not found', 404);
  }

  if (input.role !== undefined) {
    if (actorTeacherId === teacher.id && input.role !== TeacherRole.SysAdmin) {
      throw new ServiceError('cannot remove sysadmin role from current account', 409);
    }

    teacher.role = input.role;
  }

  if (input.is_active !== undefined) {
    if (actorTeacherId === teacher.id && !input.is_active) {
      throw new ServiceError('cannot deactivate current account', 409);
    }

    teacher.is_active = input.is_active;
  }

  if (input.username !== undefined) {
    teacher.username = input.username;
  }

  if (input.password !== undefined) {
    teacher.password_hash = await bcrypt.hash(input.password, config.auth.bcryptSaltRounds);
  }

  if (input.codeforces_handle !== undefined) {
    teacher.codeforces_handle = input.codeforces_handle;
  }

  if (input.codeforces_api_key !== undefined) {
    teacher.codeforces_api_key = input.codeforces_api_key;
  }

  if (input.codeforces_api_secret !== undefined) {
    teacher.codeforces_api_secret = input.codeforces_api_secret;
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
