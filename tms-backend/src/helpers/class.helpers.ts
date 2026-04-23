import { ClassStatus, SessionStatus } from '../entities/index.js';
import { ClassServiceError } from '../errors/class.error.js';
import type {
  ClassListFilters,
  CreateClassInput,
  CreateClassScheduleInput,
  CreateManualSessionInput,
  SessionListFilters,
  UpdateClassInput,
  UpdateClassScheduleInput,
  UpsertCodeforcesGroupInput,
} from '../types/class.types.js';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ClassServiceError(`${fieldName} must be an object`, 400);
  }

  return value as Record<string, unknown>;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const num = typeof value === 'string' ? Number(value) : value;

  if (typeof num !== 'number' || !Number.isInteger(num) || num <= 0) {
    throw new ClassServiceError(`${fieldName} must be a positive integer`, 400);
  }

  return num;
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
  const num = typeof value === 'string' ? Number(value.trim()) : value;

  if (typeof num !== 'number' || !Number.isInteger(num) || num < 0) {
    throw new ClassServiceError(`${fieldName} must be a non-negative integer`, 400);
  }

  return num;
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new ClassServiceError(`${fieldName} must be a string`, 400);
  }

  return value.trim();
}

function parseOptionalClassStatus(value: unknown): ClassStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== ClassStatus.Active && value !== ClassStatus.Archived) {
    throw new ClassServiceError(`status must be one of: ${ClassStatus.Active}, ${ClassStatus.Archived}`, 400);
  }

  return value;
}

function parseOptionalSessionStatus(value: unknown): SessionStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value !== SessionStatus.Scheduled
    && value !== SessionStatus.Completed
    && value !== SessionStatus.Cancelled
  ) {
    throw new ClassServiceError(
      `status must be one of: ${SessionStatus.Scheduled}, ${SessionStatus.Completed}, ${SessionStatus.Cancelled}`,
      400,
    );
  }

  return value;
}

function normalizeDateOnly(value: unknown, fieldName: string): string {
  const raw = parseString(value, fieldName);
  const match = DATE_ONLY_PATTERN.exec(raw);

  if (!match) {
    throw new ClassServiceError(`${fieldName} must be in YYYY-MM-DD format`, 400);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new ClassServiceError(`${fieldName} is not a valid date`, 400);
  }

  const canonicalYear = String(year).padStart(4, '0');
  const canonicalMonth = String(month).padStart(2, '0');
  const canonicalDay = String(day).padStart(2, '0');

  return `${canonicalYear}-${canonicalMonth}-${canonicalDay}`;
}

function normalizeTime(value: unknown, fieldName: string): string {
  const raw = parseString(value, fieldName);
  const match = TIME_PATTERN.exec(raw);

  if (!match) {
    throw new ClassServiceError(`${fieldName} must be in HH:mm or HH:mm:ss format`, 400);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new ClassServiceError(`${fieldName} has invalid time value`, 400);
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseDateTime(value: unknown, fieldName: string): Date {
  const raw = parseString(value, fieldName);
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new ClassServiceError(`${fieldName} must be a valid datetime`, 400);
  }

  return date;
}

function normalizeFeePerSession(value: unknown): string {
  const fee = parseNonNegativeInteger(value, 'fee_per_session');
  return String(fee);
}

function assertScheduleTimeRange(startTime: string, endTime: string): void {
  if (endTime <= startTime) {
    throw new ClassServiceError('end_time must be later than start_time', 400);
  }
}

export function parseIdParam(value: unknown, fieldName: string): number {
  return parsePositiveInteger(value, fieldName);
}

export function parseClassListFilters(value: unknown): ClassListFilters {
  const query = asRecord(value, 'query');
  return {
    status: parseOptionalClassStatus(query.status),
  };
}

export function parseCreateClassInput(value: unknown): CreateClassInput {
  const body = asRecord(value, 'body');
  const name = parseString(body.name, 'name');

  if (!name) {
    throw new ClassServiceError('name is required', 400);
  }

  return {
    name,
    fee_per_session: normalizeFeePerSession(body.fee_per_session),
  };
}

export function parseUpdateClassInput(value: unknown): UpdateClassInput {
  const body = asRecord(value, 'body');
  const patch: UpdateClassInput = {};

  if (body.name !== undefined) {
    const name = parseString(body.name, 'name');
    if (!name) {
      throw new ClassServiceError('name cannot be empty', 400);
    }

    patch.name = name;
  }

  if (body.fee_per_session !== undefined) {
    patch.fee_per_session = normalizeFeePerSession(body.fee_per_session);
  }

  if (Object.keys(patch).length === 0) {
    throw new ClassServiceError('at least one field is required', 400);
  }

  return patch;
}

export function parseCreateClassScheduleInput(value: unknown): CreateClassScheduleInput {
  const body = asRecord(value, 'body');
  const dayOfWeek = parseNonNegativeInteger(body.day_of_week, 'day_of_week');

  if (dayOfWeek > 6) {
    throw new ClassServiceError('day_of_week must be between 0 and 6', 400);
  }

  const startTime = normalizeTime(body.start_time, 'start_time');
  const endTime = normalizeTime(body.end_time, 'end_time');
  assertScheduleTimeRange(startTime, endTime);

  return {
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
  };
}

export function parseUpdateClassScheduleInput(value: unknown): UpdateClassScheduleInput {
  const body = asRecord(value, 'body');
  const patch: UpdateClassScheduleInput = {};

  if (body.day_of_week !== undefined) {
    const dayOfWeek = parseNonNegativeInteger(body.day_of_week, 'day_of_week');

    if (dayOfWeek > 6) {
      throw new ClassServiceError('day_of_week must be between 0 and 6', 400);
    }

    patch.day_of_week = dayOfWeek;
  }

  if (body.start_time !== undefined) {
    patch.start_time = normalizeTime(body.start_time, 'start_time');
  }

  if (body.end_time !== undefined) {
    patch.end_time = normalizeTime(body.end_time, 'end_time');
  }

  if (Object.keys(patch).length === 0) {
    throw new ClassServiceError('at least one field is required', 400);
  }

  if (patch.start_time !== undefined && patch.end_time !== undefined) {
    assertScheduleTimeRange(patch.start_time, patch.end_time);
  }

  return patch;
}

export function parseSessionListFilters(value: unknown): SessionListFilters {
  const query = asRecord(value, 'query');
  const filters: SessionListFilters = {};

  if (query.class_id !== undefined) {
    filters.class_id = parsePositiveInteger(query.class_id, 'class_id');
  }

  if (query.status !== undefined) {
    filters.status = parseOptionalSessionStatus(query.status);
  }

  if (query.from !== undefined) {
    filters.from = parseDateTime(query.from, 'from');
  }

  if (query.to !== undefined) {
    filters.to = parseDateTime(query.to, 'to');
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new ClassServiceError('from must be earlier than or equal to to', 400);
  }

  return filters;
}

export function parseCreateManualSessionInput(value: unknown): CreateManualSessionInput {
  const body = asRecord(value, 'body');

  if (body.scheduled_at !== undefined) {
    return {
      scheduled_at: parseDateTime(body.scheduled_at, 'scheduled_at'),
    };
  }

  if (body.scheduled_date === undefined || body.start_time === undefined) {
    throw new ClassServiceError('either scheduled_at or scheduled_date + start_time is required', 400);
  }

  const dateOnly = normalizeDateOnly(body.scheduled_date, 'scheduled_date');
  const time = normalizeTime(body.start_time, 'start_time');

  return {
    scheduled_at: combineDateAndTime(dateOnly, time),
  };
}

export function parseUpsertCodeforcesGroupInput(value: unknown): UpsertCodeforcesGroupInput {
  const body = asRecord(value, 'body');
  const groupUrl = parseString(body.group_url, 'group_url');

  if (!groupUrl) {
    throw new ClassServiceError('group_url is required', 400);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(groupUrl);
  } catch {
    throw new ClassServiceError('group_url must be a valid URL', 400);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new ClassServiceError('group_url must start with http:// or https://', 400);
  }

  let groupName: string | null = null;
  if (body.group_name !== undefined && body.group_name !== null) {
    const trimmed = parseString(body.group_name, 'group_name');
    groupName = trimmed || null;
  }

  return {
    group_url: parsedUrl.toString(),
    group_name: groupName,
  };
}

export function dateOnlyToDate(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value);

  if (!match) {
    throw new ClassServiceError('invalid date value', 500);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new ClassServiceError('invalid date value', 500);
  }

  return date;
}

export function combineDateAndTime(dateOnly: string, timeValue: string): Date {
  const date = dateOnlyToDate(dateOnly);
  const normalizedTime = normalizeTime(timeValue, 'start_time');
  const [hours, minutes, seconds] = normalizedTime.split(':').map(Number);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds,
    0,
  );
}
