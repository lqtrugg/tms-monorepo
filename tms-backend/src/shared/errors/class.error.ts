import { DomainError } from './domain.error.js';

export class ClassServiceError extends DomainError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message, statusCode);
  }
}
