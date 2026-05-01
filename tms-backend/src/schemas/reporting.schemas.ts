import { z } from 'zod';

import {
  booleanSchema,
  commaSeparatedPositiveIntegerArraySchema,
  dateTimeSchema,
  positiveIntegerSchema,
} from './common.schemas.js';

export const incomeReportQuerySchema = z.object({
  from: dateTimeSchema.optional(),
  to: dateTimeSchema.optional(),
  class_ids: commaSeparatedPositiveIntegerArraySchema,
  include_unpaid: booleanSchema.optional(),
});

export const studentIdParamSchema = z.object({
  studentId: positiveIntegerSchema,
});

export type IncomeReportQuery = z.infer<typeof incomeReportQuerySchema>;
export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
