import type { DiscordMessageType } from '../../../../entities/enums.js';

export type MessageRecipientCount = {
  message_id: string;
  total: string;
  sent: string;
  failed: string;
};

export type FailedMessageRecipient = {
  message_id: string;
  student_id: string;
  student_name: string | null;
  error_detail: string | null;
};

export interface MessagingReadRepository {
  listDiscordServersForTeacher(teacherId: number): Promise<Array<{
    id: number;
    teacher_id: number;
    class_id: number;
    discord_server_id: string;
    bot_token: string | null;
    name: string | null;
    attendance_voice_channel_id: string | null;
    notification_channel_id: string | null;
  }>>;
  listMessagesForTeacher(teacherId: number, filters: {
    type?: DiscordMessageType;
  }): Promise<Array<{
    id: number;
    teacher_id: number;
    server_id: number | null;
    type: DiscordMessageType;
    content: string;
    created_at: Date;
  }>>;
  countRecipientsByMessageIds(teacherId: number, messageIds: number[]): Promise<MessageRecipientCount[]>;
  listFailedRecipientsByMessageIds(teacherId: number, messageIds: number[]): Promise<FailedMessageRecipient[]>;
}
