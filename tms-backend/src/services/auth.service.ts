import bcrypt from 'bcrypt';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

import config from '../config.js';
import { AppDataSource } from '../data-source.js';
import { Teacher, TeacherRole } from '../entities/index.js';
import { AuthError } from '../errors/auth.error.js';
import {
  isUniqueViolation,
  normalizeLoginInput,
  normalizeRegisterInput,
  normalizeUpdateTeacherInput,
  toAuthTeacher,
} from '../helpers/auth.helpers.js';
import type {
  AuthTeacher,
  AuthTokenPayload,
  AuthTokenResponse,
  LoginInput,
  RegisterInput,
  UpdateTeacherInput,
} from '../types/auth.types.js';

const HARD_CODED_SYSADMIN_USERNAME = 'admin';
const HARD_CODED_SYSADMIN_PASSWORD = 'gaheocho123';

function teacherRepository() {
  return AppDataSource.getRepository(Teacher);
}

function signAccessToken(teacher: Teacher): string {
  const payload: AuthTokenPayload = {
    sub: teacher.id,
    username: teacher.username,
    role: teacher.role,
  };

  const signOptions: SignOptions = {
    expiresIn: config.auth.jwtExpiresIn as SignOptions['expiresIn'],
    issuer: config.auth.jwtIssuer,
    audience: config.auth.jwtAudience,
  };

  return jwt.sign(payload, config.auth.jwtSecret as Secret, signOptions);
}

export async function register(input: RegisterInput): Promise<AuthTokenResponse> {
  const {
    username,
    password,
    codeforces_handle,
    codeforces_api_key,
    codeforces_api_secret,
  } = normalizeRegisterInput(input);
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptSaltRounds);

  const teacher = teacherRepository().create({
    username,
    password_hash: passwordHash,
    role: TeacherRole.Teacher,
    is_active: true,
    codeforces_handle,
    codeforces_api_key,
    codeforces_api_secret,
  });

  try {
    const savedTeacher = await teacherRepository().save(teacher);

    return {
      accessToken: signAccessToken(savedTeacher),
      tokenType: 'Bearer',
      expiresIn: config.auth.jwtExpiresIn,
      teacher: toAuthTeacher(savedTeacher),
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthError('username already exists', 409);
    }

    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthTokenResponse> {
  const { username, password } = normalizeLoginInput(input);
  const teacher = await teacherRepository().findOneBy({ username });

  if (!teacher) {
    throw new AuthError('invalid username or password', 401);
  }

  if (!teacher.is_active) {
    throw new AuthError('account is inactive', 403);
  }

  const passwordMatches = await bcrypt.compare(password, teacher.password_hash);
  if (!passwordMatches) {
    throw new AuthError('invalid username or password', 401);
  }

  return {
    accessToken: signAccessToken(teacher),
    tokenType: 'Bearer',
    expiresIn: config.auth.jwtExpiresIn,
    teacher: toAuthTeacher(teacher),
  };
}

export function me(teacher: Teacher): AuthTeacher {
  return toAuthTeacher(teacher);
}

export async function updateMe(teacherId: number, input: UpdateTeacherInput): Promise<AuthTeacher> {
  const patch = normalizeUpdateTeacherInput(input);
  const repository = teacherRepository();
  const teacher = await repository.findOneBy({ id: teacherId });

  if (!teacher) {
    throw new AuthError('teacher not found', 404);
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
    return toAuthTeacher(saved);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AuthError('username already exists', 409);
    }

    throw error;
  }
}

export async function ensureSystemAdminAccount(): Promise<void> {
  const username = HARD_CODED_SYSADMIN_USERNAME;
  const password = HARD_CODED_SYSADMIN_PASSWORD;

  const repository = teacherRepository();
  let sysAdmin = await repository.findOneBy({ username });
  const passwordHash = await bcrypt.hash(password, config.auth.bcryptSaltRounds);

  if (!sysAdmin) {
    sysAdmin = repository.create({
      username,
      password_hash: passwordHash,
      role: TeacherRole.SysAdmin,
      is_active: true,
      codeforces_handle: null,
      codeforces_api_key: null,
      codeforces_api_secret: null,
    });

    await repository.save(sysAdmin);
    return;
  }

  let hasChanges = false;

  if (sysAdmin.role !== TeacherRole.SysAdmin) {
    sysAdmin.role = TeacherRole.SysAdmin;
    hasChanges = true;
  }

  if (!sysAdmin.is_active) {
    sysAdmin.is_active = true;
    hasChanges = true;
  }

  const passwordMatches = await bcrypt.compare(password, sysAdmin.password_hash);
  if (!passwordMatches) {
    sysAdmin.password_hash = passwordHash;
    hasChanges = true;
  }

  if (hasChanges) {
    await repository.save(sysAdmin);
  }
}
