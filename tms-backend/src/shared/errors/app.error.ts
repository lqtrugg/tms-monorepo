import { DomainError } from './domain.error.js';

export class AppError extends DomainError {
  constructor(
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message, statusCode);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
