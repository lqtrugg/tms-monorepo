import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

import config from '../../../../config.js';
import type { AccessTokenSigner } from '../../application/ports/AccessTokenSigner.js';

export class JwtAccessTokenSigner implements AccessTokenSigner {
  sign(input: { sub: number; username: string; role: import('../../../../entities/enums.js').TeacherRole }): string {
    const signOptions: SignOptions = {
      expiresIn: config.auth.jwtExpiresIn as SignOptions['expiresIn'],
      issuer: config.auth.jwtIssuer,
      audience: config.auth.jwtAudience,
    };

    return jwt.sign(input, config.auth.jwtSecret as Secret, signOptions);
  }
}
