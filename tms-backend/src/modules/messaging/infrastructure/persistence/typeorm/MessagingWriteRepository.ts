import type { DiscordMessage } from '../../../../../entities/discord-message.entity.js';
import type { DiscordMessageRecipient } from '../../../../../entities/discord-message-recipient.entity.js';
import type { DiscordServer } from '../../../../../entities/discord-server.entity.js';

export type BulkDmRecipientContext = {
  student_id: number;
  student_name: string;
  discord_username: string | null;
  active_class_id: number | null;
  discord_server: DiscordServer | null;
};

export interface MessagingWriteRepository {
  findDiscordServerByClass(teacherId: number, classId: number): Promise<DiscordServer | null>;
  removeDiscordServer(server: DiscordServer): Promise<DiscordServer>;
  createDiscordServer(values: Partial<DiscordServer>): DiscordServer;
  saveDiscordServer(server: DiscordServer): Promise<DiscordServer>;
  listBulkDmRecipientContextsByStudentIds(teacherId: number, studentIds: number[]): Promise<BulkDmRecipientContext[]>;
  listBulkDmRecipientContextsByClass(teacherId: number, classId: number): Promise<BulkDmRecipientContext[]>;
  findDiscordServersByIds(teacherId: number, serverIds: number[]): Promise<DiscordServer[]>;
  createMessageWithRecipients(input: {
    messageValues: Partial<DiscordMessage>;
    recipientValues: Array<Partial<DiscordMessageRecipient>>;
  }): Promise<{ message: DiscordMessage; recipients: DiscordMessageRecipient[] }>;
  createChannelPostMessages(values: Array<Partial<DiscordMessage>>): Promise<DiscordMessage[]>;
}
