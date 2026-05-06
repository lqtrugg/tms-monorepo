import { DomainError } from './domain.error.js';

export class StudentServiceError extends DomainError {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message, statusCode);
  }
}
