import { PendingArchiveReason, Student, StudentStatus } from '../entities/index.js';
import { StudentServiceError } from '../errors/student.error.js';
import type {
  ArchivePendingStudentInput,
  CreateStudentInput,
  ExpelStudentInput,
  StudentBalanceSnapshot,
  StudentListFilters,
  StudentSummary,
  TransferStudentInput,
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

  if (!fullName) {
    throw new StudentServiceError('full_name is required', 400);
  }

  return {
    full_name: fullName,
    class_id: parsePositiveInteger(body.class_id, 'class_id'),
    codeforces_handle: parseNullableString(body.codeforces_handle, 'codeforces_handle'),
    discord_username: parseNullableString(body.discord_username, 'discord_username'),
    phone: parseNullableString(body.phone, 'phone'),
    note: parseNullableString(body.note, 'note'),
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
