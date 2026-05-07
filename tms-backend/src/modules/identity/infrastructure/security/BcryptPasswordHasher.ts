import bcrypt from 'bcrypt';

import config from '../../../../config.js';
import type { PasswordHasher } from '../../application/ports/PasswordHasher.js';

export class BcryptPasswordHasher implements PasswordHasher {
  hash(value: string): Promise<string> {
    return bcrypt.hash(value, config.auth.bcryptSaltRounds);
  }

  compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
