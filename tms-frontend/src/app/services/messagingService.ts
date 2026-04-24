import { apiRequest } from "./apiClient";

export type BackendDiscordMessageType = "auto_notification" | "channel_post" | "bulk_dm";

export interface BackendDiscordServer {
  id: number;
  teacher_id: number;
  class_id: number;
  discord_server_id: string;
  name: string | null;
  bot_token?: string | null;
  attendance_voice_channel_id: string | null;
  notification_channel_id: string | null;
}

export interface BackendMessageListRow {
  id: number;
  teacher_id: number;
  type: BackendDiscordMessageType;
  content: string;
  server_id: number | null;
  created_at: string;
  recipients: {
    total: number;
    sent: number;
    failed: number;
  };
}

export async function listDiscordServers(): Promise<BackendDiscordServer[]> {
  const data = await apiRequest<{ servers: BackendDiscordServer[] }>("/discord/servers");
  return data.servers;
}

export async function upsertDiscordServerByClass(
  classId: number,
  payload: {
    discord_server_id: string;
    bot_token?: string | null;
    attendance_voice_channel_id?: string | null;
    notification_channel_id?: string | null;
  },
): Promise<BackendDiscordServer> {
  const data = await apiRequest<{ server: BackendDiscordServer }>(`/classes/${classId}/discord-server`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return data.server;
}

export async function listMessages(type?: BackendDiscordMessageType): Promise<BackendMessageListRow[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await apiRequest<{ messages: BackendMessageListRow[] }>(`/discord/messages${query}`);
  return data.messages;
}

export async function sendBulkDm(payload: {
  content: string;
  student_ids?: number[];
  class_id?: number;
}) {
  return apiRequest<{
    message: {
      id: number;
      teacher_id: number;
      type: BackendDiscordMessageType;
      content: string;
      server_id: number | null;
      created_at: string;
    };
    recipients_total: number;
    sent: number;
    failed: number;
  }>("/discord/messages/bulk-dm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendChannelPost(payload: {
  content: string;
  server_ids: number[];
}) {
  return apiRequest<{
    messages: Array<{
      id: number;
      teacher_id: number;
      type: BackendDiscordMessageType;
      content: string;
      server_id: number | null;
      created_at: string;
    }>;
    targets_total: number;
    sent: number;
    failed: number;
    failures: Array<{
      server_id: number;
      error: string;
    }>;
  }>("/discord/messages/channel-post", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
