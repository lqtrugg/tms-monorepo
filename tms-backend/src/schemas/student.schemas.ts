import { z } from 'zod';

import { PendingArchiveReason, StudentStatus } from '../entities/index.js';
import {
  booleanSchema,
  dateTimeSchema,
  optionalTrimmedStringSchema,
  positiveIntegerArraySchema,
  positiveIntegerSchema,
  requiredTrimmedStringSchema,
} from './common.schemas.js';

const nullableTrimmedStringSchema = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const nonEmptyStudentIdsSchema = positiveIntegerArraySchema.refine((value) => value.length > 0, {
  message: 'student_ids must include at least one student',
});

export const studentIdParamSchema = z.object({
  studentId: positiveIntegerSchema,
});

export const studentListQuerySchema = z.object({
  status: z.nativeEnum(StudentStatus).optional(),
  pending_archive_reason: z.nativeEnum(PendingArchiveReason).optional(),
  class_id: positiveIntegerSchema.optional(),
  search: optionalTrimmedStringSchema,
});

export const createStudentBodySchema = z.object({
  full_name: requiredTrimmedStringSchema,
  class_id: positiveIntegerSchema,
  codeforces_handle: nullableTrimmedStringSchema,
  discord_username: requiredTrimmedStringSchema,
  phone: nullableTrimmedStringSchema,
  note: nullableTrimmedStringSchema,
  enrolled_at: dateTimeSchema.optional().default(() => new Date()),
});

export const updateStudentBodySchema = z.object({
  full_name: requiredTrimmedStringSchema.optional(),
  codeforces_handle: nullableTrimmedStringSchema.optional(),
  discord_username: requiredTrimmedStringSchema.optional(),
  phone: nullableTrimmedStringSchema.optional(),
  note: nullableTrimmedStringSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'at least one field is required',
});

export const reinstateStudentBodySchema = z.object({
  class_id: positiveIntegerSchema,
  enrolled_at: dateTimeSchema.optional().default(() => new Date()),
});

export const transferStudentBodySchema = z.object({
  to_class_id: positiveIntegerSchema.optional(),
  class_id: positiveIntegerSchema.optional(),
  transferred_at: dateTimeSchema.optional().default(() => new Date()),
}).transform((value, ctx) => {
  const toClassId = value.to_class_id ?? value.class_id;
  if (toClassId === undefined) {
    ctx.addIssue({ code: 'custom', message: 'to_class_id is required', path: ['to_class_id'] });
    return z.NEVER;
  }

  return {
    to_class_id: toClassId,
    transferred_at: value.transferred_at,
  };
});

export const expelStudentBodySchema = z.object({
  expelled_at: dateTimeSchema.optional().default(() => new Date()),
});

export const bulkTransferStudentsBodySchema = z.object({
  student_ids: nonEmptyStudentIdsSchema,
  to_class_id: positiveIntegerSchema.optional(),
  class_id: positiveIntegerSchema.optional(),
  transferred_at: dateTimeSchema.optional().default(() => new Date()),
}).transform((value, ctx) => {
  const toClassId = value.to_class_id ?? value.class_id;
  if (toClassId === undefined) {
    ctx.addIssue({ code: 'custom', message: 'to_class_id is required', path: ['to_class_id'] });
    return z.NEVER;
  }

  return {
    student_ids: value.student_ids,
    to_class_id: toClassId,
    transferred_at: value.transferred_at,
  };
});

export const bulkExpelStudentsBodySchema = z.object({
  student_ids: nonEmptyStudentIdsSchema,
  expelled_at: dateTimeSchema.optional().default(() => new Date()),
});

export const archivePendingStudentBodySchema = z.object({
  archived_at: dateTimeSchema.optional().default(() => new Date()),
  settle_finance: booleanSchema.optional().default(false),
});

export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
export type CreateStudentBody = z.infer<typeof createStudentBodySchema>;
export type UpdateStudentBody = z.infer<typeof updateStudentBodySchema>;
export type ReinstateStudentBody = z.infer<typeof reinstateStudentBodySchema>;
export type TransferStudentBody = z.infer<typeof transferStudentBodySchema>;
export type ExpelStudentBody = z.infer<typeof expelStudentBodySchema>;
export type BulkTransferStudentsBody = z.infer<typeof bulkTransferStudentsBodySchema>;
export type BulkExpelStudentsBody = z.infer<typeof bulkExpelStudentsBodySchema>;
export type ArchivePendingStudentBody = z.infer<typeof archivePendingStudentBodySchema>;
