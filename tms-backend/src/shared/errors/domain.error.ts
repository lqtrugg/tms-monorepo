export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

