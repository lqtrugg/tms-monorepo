import type { Teacher } from '../../entities/index.js';
import type {
  AuthTeacher,
  AuthTokenResponse,
  LoginInput,
  RegisterInput,
  UpdateTeacherInput,
} from './auth.types.js';
import { identityService } from './identity.service.js';

export function register(input: RegisterInput): Promise<AuthTokenResponse> {
  return identityService.register(input);
}

export function login(input: LoginInput): Promise<AuthTokenResponse> {
  return identityService.login(input);
}

export function me(teacher: Teacher): AuthTeacher {
  return identityService.me(teacher);
}

export function updateMe(teacherId: number, input: UpdateTeacherInput): Promise<AuthTeacher> {
  return identityService.updateMe(teacherId, input);
}

export function ensureSystemAdminAccount(): Promise<void> {
  return identityService.ensureSystemAdminAccount();
}

