import { z } from 'zod';

import { DiscordMessageType } from '../entities/index.js';
import {
  nullableOptionalTrimmedStringSchema,
  optionalPositiveIntegerArraySchema,
  positiveIntegerArraySchema,
  positiveIntegerSchema,
  requiredTrimmedStringSchema,
} from './common.schemas.js';

export const classIdParamSchema = z.object({
  classId: positiveIntegerSchema,
});

export const upsertDiscordServerBodySchema = z.object({
  discord_server_id: requiredTrimmedStringSchema,
  bot_token: nullableOptionalTrimmedStringSchema,
  attendance_voice_channel_id: nullableOptionalTrimmedStringSchema,
  notification_channel_id: nullableOptionalTrimmedStringSchema,
});

export const messageListQuerySchema = z.object({
  type: z.nativeEnum(DiscordMessageType).optional(),
});

export const bulkDmBodySchema = z.object({
  content: requiredTrimmedStringSchema,
  class_id: positiveIntegerSchema.optional(),
  student_ids: optionalPositiveIntegerArraySchema,
});

export const channelPostBodySchema = z.object({
  content: requiredTrimmedStringSchema,
  server_ids: positiveIntegerArraySchema.optional().default([]),
});

export type ClassIdParam = z.infer<typeof classIdParamSchema>;
export type UpsertDiscordServerBody = z.infer<typeof upsertDiscordServerBodySchema>;
export type MessageListQuery = z.infer<typeof messageListQuerySchema>;
export type BulkDmBody = z.infer<typeof bulkDmBodySchema>;
export type ChannelPostBody = z.infer<typeof channelPostBodySchema>;
