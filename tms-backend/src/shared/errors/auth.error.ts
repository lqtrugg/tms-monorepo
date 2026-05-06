import { DomainError } from './domain.error.js';

export class AuthError extends DomainError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message, statusCode);
  }
}
