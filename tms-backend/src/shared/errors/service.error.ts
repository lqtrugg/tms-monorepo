import { DomainError } from './domain.error.js';

export class ServiceError extends DomainError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
  }
}
