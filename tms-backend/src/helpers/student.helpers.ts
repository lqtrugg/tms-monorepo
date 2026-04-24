import { PendingArchiveReason, Student, StudentStatus } from '../entities/index.js';
import { StudentServiceError } from '../errors/student.error.js';
import type {
  ArchivePendingStudentInput,
  BulkExpelStudentsInput,
  BulkTransferStudentsInput,
  CreateStudentInput,
  ExpelStudentInput,
  ReinstateStudentInput,
  StudentBalanceSnapshot,
  StudentListFilters,
  StudentSummary,
  TransferStudentInput,
  UpdateStudentInput,
} from '../types/student.types.js';

function asRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new StudentServiceError(`${fieldName} must be an object`, 400);
  }

  return value as Record<string, unknown>;
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const numericValue = typeof value === 'string' ? Number(value.trim()) : value;

  if (typeof numericValue !== 'number' || !Number.isInteger(numericValue) || numericValue <= 0) {
    throw new StudentServiceError(`${fieldName} must be a positive integer`, 400);
  }

  return numericValue;
}

function parsePositiveIntegerArray(value: unknown, fieldName: string): number[] {
  if (!Array.isArray(value)) {
    throw new StudentServiceError(`${fieldName} must be an array`, 400);
  }

  const parsedValues = value.map((item) => parsePositiveInteger(item, fieldName));
  const uniqueValues = Array.from(new Set(parsedValues));

  if (uniqueValues.length === 0) {
    throw new StudentServiceError(`${fieldName} must include at least one student`, 400);
  }

  return uniqueValues;
}

function parseString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new StudentServiceError(`${fieldName} must be a string`, 400);
  }

  return value.trim();
}

function parseDateTime(value: unknown, fieldName: string): Date {
  const raw = parseString(value, fieldName);
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new StudentServiceError(`${fieldName} must be a valid datetime`, 400);
  }

  return parsed;
}

function parseNullableString(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = parseString(value, fieldName);
  return normalized || null;
}

function parseOptionalStudentStatus(value: unknown): StudentStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value !== StudentStatus.Active
    && value !== StudentStatus.PendingArchive
    && value !== StudentStatus.Archived
  ) {
    throw new StudentServiceError(
      `status must be one of: ${StudentStatus.Active}, ${StudentStatus.PendingArchive}, ${StudentStatus.Archived}`,
      400,
    );
  }

  return value;
}

function parseOptionalPendingArchiveReason(value: unknown): PendingArchiveReason | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== PendingArchiveReason.NeedsCollection && value !== PendingArchiveReason.NeedsRefund) {
    throw new StudentServiceError(
      `pending_archive_reason must be one of: ${PendingArchiveReason.NeedsCollection}, ${PendingArchiveReason.NeedsRefund}`,
      400,
    );
  }

  return value;
}

export function parseIdParam(value: unknown, fieldName: string): number {
  return parsePositiveInteger(value, fieldName);
}

export function parseStudentListFilters(value: unknown): StudentListFilters {
  const query = asRecord(value, 'query');
  const searchValue = query.search === undefined ? undefined : parseString(query.search, 'search');

  return {
    status: parseOptionalStudentStatus(query.status),
    pending_archive_reason: parseOptionalPendingArchiveReason(query.pending_archive_reason),
    class_id: query.class_id === undefined ? undefined : parsePositiveInteger(query.class_id, 'class_id'),
    search: searchValue && searchValue.length > 0 ? searchValue : undefined,
  };
}

export function parseCreateStudentInput(value: unknown): CreateStudentInput {
  const body = asRecord(value, 'body');
  const fullName = parseString(body.full_name, 'full_name');
  const discordUsername = parseString(body.discord_username, 'discord_username');

  if (!fullName) {
    throw new StudentServiceError('full_name is required', 400);
  }

  if (!discordUsername) {
    throw new StudentServiceError('discord_username is required', 400);
  }

  return {
    full_name: fullName,
    class_id: parsePositiveInteger(body.class_id, 'class_id'),
    codeforces_handle: parseNullableString(body.codeforces_handle, 'codeforces_handle'),
    discord_username: discordUsername,
    phone: parseNullableString(body.phone, 'phone'),
    note: parseNullableString(body.note, 'note'),
    enrolled_at: body.enrolled_at === undefined ? new Date() : parseDateTime(body.enrolled_at, 'enrolled_at'),
  };
}

export function parseUpdateStudentInput(value: unknown): UpdateStudentInput {
  const body = asRecord(value, 'body');
  const patch: UpdateStudentInput = {};

  if (body.full_name !== undefined) {
    const fullName = parseString(body.full_name, 'full_name');
    if (!fullName) {
      throw new StudentServiceError('full_name cannot be empty', 400);
    }
    patch.full_name = fullName;
  }

  if (body.codeforces_handle !== undefined) {
    patch.codeforces_handle = parseNullableString(body.codeforces_handle, 'codeforces_handle');
  }

  if (body.discord_username !== undefined) {
    const discordUsername = parseString(body.discord_username, 'discord_username');
    if (!discordUsername) {
      throw new StudentServiceError('discord_username cannot be empty', 400);
    }
    patch.discord_username = discordUsername;
  }

  if (body.phone !== undefined) {
    patch.phone = parseNullableString(body.phone, 'phone');
  }

  if (body.note !== undefined) {
    patch.note = parseNullableString(body.note, 'note');
  }

  if (Object.keys(patch).length === 0) {
    throw new StudentServiceError('at least one field is required', 400);
  }

  return patch;
}

export function parseReinstateStudentInput(value: unknown): ReinstateStudentInput {
  const body = asRecord(value, 'body');

  return {
    class_id: parsePositiveInteger(body.class_id, 'class_id'),
    enrolled_at: body.enrolled_at === undefined ? new Date() : parseDateTime(body.enrolled_at, 'enrolled_at'),
  };
}

export function parseTransferStudentInput(value: unknown): TransferStudentInput {
  const body = asRecord(value, 'body');
  const toClassIdRaw = body.to_class_id ?? body.class_id;

  if (toClassIdRaw === undefined) {
    throw new StudentServiceError('to_class_id is required', 400);
  }

  return {
    to_class_id: parsePositiveInteger(toClassIdRaw, 'to_class_id'),
    transferred_at: body.transferred_at === undefined
      ? new Date()
      : parseDateTime(body.transferred_at, 'transferred_at'),
  };
}

export function parseExpelStudentInput(value: unknown): ExpelStudentInput {
  const body = asRecord(value, 'body');

  return {
    expelled_at: body.expelled_at === undefined ? new Date() : parseDateTime(body.expelled_at, 'expelled_at'),
  };
}

export function parseBulkTransferStudentsInput(value: unknown): BulkTransferStudentsInput {
  const body = asRecord(value, 'body');
  const toClassIdRaw = body.to_class_id ?? body.class_id;

  if (toClassIdRaw === undefined) {
    throw new StudentServiceError('to_class_id is required', 400);
  }

  return {
    student_ids: parsePositiveIntegerArray(body.student_ids, 'student_ids'),
    to_class_id: parsePositiveInteger(toClassIdRaw, 'to_class_id'),
    transferred_at: body.transferred_at === undefined
      ? new Date()
      : parseDateTime(body.transferred_at, 'transferred_at'),
  };
}

export function parseBulkExpelStudentsInput(value: unknown): BulkExpelStudentsInput {
  const body = asRecord(value, 'body');

  return {
    student_ids: parsePositiveIntegerArray(body.student_ids, 'student_ids'),
    expelled_at: body.expelled_at === undefined ? new Date() : parseDateTime(body.expelled_at, 'expelled_at'),
  };
}

export function parseArchivePendingStudentInput(value: unknown): ArchivePendingStudentInput {
  const body = asRecord(value, 'body');

  return {
    archived_at: body.archived_at === undefined ? new Date() : parseDateTime(body.archived_at, 'archived_at'),
  };
}

export function toStudentSummary(
  student: Student,
  context: {
    current_class_id: number | null;
    current_enrollment_id: number | null;
    balance_snapshot: StudentBalanceSnapshot;
  },
): StudentSummary {
  return {
    id: student.id,
    teacher_id: student.teacher_id,
    full_name: student.full_name,
    codeforces_handle: student.codeforces_handle,
    discord_username: student.discord_username,
    phone: student.phone,
    note: student.note,
    status: student.status,
    pending_archive_reason: student.pending_archive_reason,
    created_at: student.created_at,
    archived_at: student.archived_at,
    current_class_id: context.current_class_id,
    current_enrollment_id: context.current_enrollment_id,
    transactions_total: context.balance_snapshot.transactions_total,
    active_fee_total: context.balance_snapshot.active_fee_total,
    balance: context.balance_snapshot.balance,
  };
}
