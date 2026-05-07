import type { TeacherRole } from '../../../../entities/enums.js';

export interface AccessTokenSigner {
  sign(input: {
    sub: number;
    username: string;
    role: TeacherRole;
  }): string;
}
