import { ServiceError } from '../errors/service.error.js';

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ServiceError(`${fieldName} must be an object`, 400);
  }

  return value as Record<string, unknown>;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const num = typeof value === 'string' ? Number(value.trim()) : value;

  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) {
    throw new ServiceError(`${fieldName} must be a positive integer`, 400);
  }

  return num;
}

function parseDateTime(value: unknown, fieldName: string): Date {
  if (typeof value !== 'string') {
    throw new ServiceError(`${fieldName} must be a datetime string`, 400);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ServiceError(`${fieldName} must be a valid datetime`, 400);
  }

  return parsed;
}

function parseBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new ServiceError(`${fieldName} must be a boolean`, 400);
}

function parseOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ServiceError(`${fieldName} must be a string`, 400);
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseRequiredString(value: unknown, fieldName: string): string {
  const normalized = parseOptionalString(value, fieldName);

  if (!normalized) {
    throw new ServiceError(`${fieldName} is required`, 400);
  }

  return normalized;
}

function parseIntegerArrayFromQuery(value: unknown, fieldName: string): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new ServiceError(`${fieldName} must be a comma separated string`, 400);
  }

  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  const values = normalized.split(',').map((item) => parsePositiveInteger(item, fieldName));
  return Array.from(new Set(values));
}

function parseIntegerArrayFromBody(value: unknown, fieldName: string): number[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ServiceError(`${fieldName} must be an array`, 400);
  }

  const values = value.map((item) => parsePositiveInteger(item, fieldName));
  return Array.from(new Set(values));
}

export {
  asRecord,
  parseBoolean,
  parseDateTime,
  parseIntegerArrayFromBody,
  parseIntegerArrayFromQuery,
  parseOptionalString,
  parsePositiveInteger,
  parseRequiredString,
};
