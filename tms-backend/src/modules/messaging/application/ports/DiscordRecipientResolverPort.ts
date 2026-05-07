export type DiscordServerContext = {
  id: number;
  teacher_id: number;
  class_id: number;
  discord_server_id: string;
  name: string | null;
  bot_token: string | null;
  attendance_voice_channel_id: string | null;
  notification_channel_id: string | null;
};

export type ResolvedDiscordRecipient = {
  userId: string | null;
  error?: string | null;
};

export interface DiscordRecipientResolverPort {
  resolve(server: DiscordServerContext, discordUsername: string | null): Promise<ResolvedDiscordRecipient>;
}
