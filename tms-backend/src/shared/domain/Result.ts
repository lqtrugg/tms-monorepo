import type { DomainError } from './DomainError.js';

export type Result<T, E = DomainError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
