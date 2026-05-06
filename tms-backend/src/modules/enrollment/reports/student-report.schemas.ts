import { z } from 'zod';

import { positiveIntegerSchema } from '../../../shared/schemas/common.schemas.js';

export const studentIdParamSchema = z.object({
  studentId: positiveIntegerSchema,
});

export type StudentIdParam = z.infer<typeof studentIdParamSchema>;
