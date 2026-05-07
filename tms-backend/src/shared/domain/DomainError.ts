export class DomainError extends Error {
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
  }
}
