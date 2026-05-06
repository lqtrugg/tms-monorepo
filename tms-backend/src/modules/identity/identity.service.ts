import bcrypt from 'bcrypt';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

import config from '../../config.js';
import { Teacher, TeacherRole } from '../../entities/index.js';
import { AuthError } from '../../shared/errors/auth.error.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import { toAdminTeacher } from './admin.mapper.js';
import type { AdminTeacher, CreateTeacherByAdminInput, UpdateTeacherByAdminInput } from './admin.types.js';
import { isUniqueViolation, toAuthTeacher } from './auth.mapper.js';
import type {
  AuthTeacher,
  AuthTokenPayload,
  AuthTokenResponse,
  LoginInput,
  RegisterInput,
  UpdateTeacherInput,
} from './auth.types.js';
import {
  createTeacher,
  findTeacherById,
  findTeacherByUsername,
  listTeachersNewestFirst,
  saveTeacher,
} from './identity.repository.js';

const HARD_CODED_SYSADMIN_USERNAME = 'admin';
const HARD_CODED_SYSADMIN_PASSWORD = 'gaheocho123';

export class IdentityService {
  async register(input: RegisterInput): Promise<AuthTokenResponse> {
    const passwordHash = await bcrypt.hash(input.password, config.auth.bcryptSaltRounds);

    const teacher = createTeacher({
      username: input.username,
      password_hash: passwordHash,
      role: TeacherRole.Teacher,
      is_active: true,
      codeforces_handle: input.codeforces_handle,
      codeforces_api_key: input.codeforces_api_key,
      codeforces_api_secret: input.codeforces_api_secret,
    });

    try {
      const savedTeacher = await saveTeacher(teacher);

      return {
        accessToken: this.signAccessToken(savedTeacher),
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

  async login(input: LoginInput): Promise<AuthTokenResponse> {
    const teacher = await findTeacherByUsername(input.username);

    if (!teacher) {
      throw new AuthError('invalid username or password', 401);
    }

    if (!teacher.is_active) {
      throw new AuthError('account is inactive', 403);
    }

    const passwordMatches = await bcrypt.compare(input.password, teacher.password_hash);
    if (!passwordMatches) {
      throw new AuthError('invalid username or password', 401);
    }

    return {
      accessToken: this.signAccessToken(teacher),
      tokenType: 'Bearer',
      expiresIn: config.auth.jwtExpiresIn,
      teacher: toAuthTeacher(teacher),
    };
  }

  me(teacher: Teacher): AuthTeacher {
    return toAuthTeacher(teacher);
  }

  async updateMe(teacherId: number, input: UpdateTeacherInput): Promise<AuthTeacher> {
    const teacher = await findTeacherById(teacherId);

    if (!teacher) {
      throw new AuthError('teacher not found', 404);
    }

    await this.applyTeacherProfileUpdates(teacher, input);

    try {
      const saved = await saveTeacher(teacher);
      return toAuthTeacher(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuthError('username already exists', 409);
      }

      throw error;
    }
  }

  async listTeachersForAdmin(): Promise<AdminTeacher[]> {
    const teachers = await listTeachersNewestFirst();
    return teachers.map(toAdminTeacher);
  }

  async createTeacherByAdmin(input: CreateTeacherByAdminInput): Promise<AdminTeacher> {
    const passwordHash = await bcrypt.hash(input.password, config.auth.bcryptSaltRounds);

    const teacher = createTeacher({
      username: input.username,
      password_hash: passwordHash,
      role: input.role ?? TeacherRole.Teacher,
      is_active: input.is_active ?? true,
      codeforces_handle: input.codeforces_handle,
      codeforces_api_key: input.codeforces_api_key,
      codeforces_api_secret: input.codeforces_api_secret,
    });

    try {
      const saved = await saveTeacher(teacher);
      return toAdminTeacher(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceError('username already exists', 409);
      }

      throw error;
    }
  }

  async updateTeacherByAdmin(
    actorTeacherId: number,
    teacherId: number,
    input: UpdateTeacherByAdminInput,
  ): Promise<AdminTeacher> {
    const teacher = await findTeacherById(teacherId);

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

    await this.applyTeacherProfileUpdates(teacher, input);

    try {
      const saved = await saveTeacher(teacher);
      return toAdminTeacher(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceError('username already exists', 409);
      }

      throw error;
    }
  }

  async ensureSystemAdminAccount(): Promise<void> {
    let sysAdmin = await findTeacherByUsername(HARD_CODED_SYSADMIN_USERNAME);
    const passwordHash = await bcrypt.hash(HARD_CODED_SYSADMIN_PASSWORD, config.auth.bcryptSaltRounds);

    if (!sysAdmin) {
      sysAdmin = createTeacher({
        username: HARD_CODED_SYSADMIN_USERNAME,
        password_hash: passwordHash,
        role: TeacherRole.SysAdmin,
        is_active: true,
        codeforces_handle: null,
        codeforces_api_key: null,
        codeforces_api_secret: null,
      });

      await saveTeacher(sysAdmin);
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

    const passwordMatches = await bcrypt.compare(HARD_CODED_SYSADMIN_PASSWORD, sysAdmin.password_hash);
    if (!passwordMatches) {
      sysAdmin.password_hash = passwordHash;
      hasChanges = true;
    }

    if (hasChanges) {
      await saveTeacher(sysAdmin);
    }
  }

  private signAccessToken(teacher: Teacher): string {
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

  private async applyTeacherProfileUpdates(
    teacher: Teacher,
    input: UpdateTeacherInput | UpdateTeacherByAdminInput,
  ): Promise<void> {
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
  }
}

export const identityService = new IdentityService();

