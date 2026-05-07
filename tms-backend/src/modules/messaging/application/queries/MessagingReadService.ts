import type { DiscordMessageType } from '../../../../entities/enums.js';
import type { MessagingReadRepository } from './MessagingReadRepository.js';

export class MessagingReadService {
  constructor(private readonly messagingReadRepository: MessagingReadRepository) {}

  async listDiscordServers(teacherId: number) {
    const servers = await this.messagingReadRepository.listDiscordServersForTeacher(teacherId);

    return servers.map((server) => ({
      ...server,
      bot_token: null,
    }));
  }

  async listMessages(teacherId: number, filters: { type?: DiscordMessageType }) {
    const messages = await this.messagingReadRepository.listMessagesForTeacher(teacherId, filters);

    if (messages.length === 0) {
      return [];
    }

    const messageIds = messages.map((message) => message.id);
    const recipientCounts = await this.messagingReadRepository.countRecipientsByMessageIds(
      teacherId,
      messageIds,
    );

    const countMap = new Map(
      recipientCounts.map((row) => [
        Number(row.message_id),
        {
          total: Number(row.total),
          sent: Number(row.sent),
          failed: Number(row.failed),
        },
      ]),
    );

    const failedRecipients = await this.messagingReadRepository.listFailedRecipientsByMessageIds(
      teacherId,
      messageIds,
    );
    const failuresByMessageId = new Map<number, Array<{
      student_id: number;
      student_name: string;
      error: string;
    }>>();

    failedRecipients.forEach((recipient) => {
      const messageId = Number(recipient.message_id);
      const failures = failuresByMessageId.get(messageId) ?? [];
      failures.push({
        student_id: Number(recipient.student_id),
        student_name: recipient.student_name ?? `Học sinh #${recipient.student_id}`,
        error: recipient.error_detail ?? 'unknown delivery error',
      });
      failuresByMessageId.set(messageId, failures);
    });

    return messages.map((message) => ({
      ...message,
      recipients: countMap.get(message.id) ?? { total: 0, sent: 0, failed: 0 },
      failures: failuresByMessageId.get(message.id) ?? [],
    }));
  }
}
