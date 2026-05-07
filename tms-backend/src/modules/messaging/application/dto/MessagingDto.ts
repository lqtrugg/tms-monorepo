import type { DiscordMessageType } from '../../../../entities/enums.js';

export type UpsertDiscordServerInput = {
  discord_server_id: string;
  bot_token?: string | null;
  attendance_voice_channel_id?: string | null;
  notification_channel_id?: string | null;
};

export type MessageListFilters = {
  type?: DiscordMessageType;
};

export type BulkDmInput = {
  content: string;
  student_ids?: number[];
  class_id?: number;
};

export type ChannelPostInput = {
  content: string;
  server_ids: number[];
};
