import { z } from 'zod';

import {
  dateTimeSchema,
  optionalTrimmedStringSchema,
  positiveIntegerSchema,
  requiredTrimmedStringSchema,
} from '../../shared/schemas/common.schemas.js';

export const topicIdParamSchema = z.object({
  topicId: positiveIntegerSchema,
});

export const topicListQuerySchema = z.object({
  class_id: positiveIntegerSchema.optional(),
  status: z.enum(['active', 'closed']).optional(),
});

export const createTopicBodySchema = z.object({
  class_id: positiveIntegerSchema,
  gym_link: requiredTrimmedStringSchema,
  pull_interval_minutes: positiveIntegerSchema.optional(),
});

export const addTopicProblemBodySchema = z.object({
  problem_index: requiredTrimmedStringSchema,
  problem_name: optionalTrimmedStringSchema.nullish().transform((value) => value ?? null),
});

export const upsertTopicStandingBodySchema = z.object({
  student_id: positiveIntegerSchema,
  problem_id: positiveIntegerSchema,
  solved: z.boolean().optional().default(false),
  penalty_minutes: positiveIntegerSchema.nullish().transform((value) => value ?? null),
  pulled_at: dateTimeSchema.optional(),
});

export type TopicIdParam = z.infer<typeof topicIdParamSchema>;
export type TopicListQuery = z.infer<typeof topicListQuerySchema>;
export type CreateTopicBody = z.infer<typeof createTopicBodySchema>;
export type AddTopicProblemBody = z.infer<typeof addTopicProblemBodySchema>;
export type UpsertTopicStandingBody = z.infer<typeof upsertTopicStandingBodySchema>;
