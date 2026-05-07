import { DiscordMessageType, DiscordSendStatus } from '../../../../entities/enums.js';
import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { BulkDmInput } from '../dto/MessagingDto.js';
import type { DiscordGatewayFactory } from '../ports/DiscordGateway.js';
import type { DiscordRecipientResolverPort } from '../ports/DiscordRecipientResolverPort.js';
import type { MessagingWriteRepository } from '../../infrastructure/persistence/typeorm/MessagingWriteRepository.js';

function normalizeIdArray(values: number[] | undefined): number[] {
  if (!values) {
    return [];
  }

  return Array.from(new Set(values.filter((item) => Number.isInteger(item) && item > 0)));
}

function toFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof ServiceError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export class SendBulkDmUseCase {
  constructor(
    private readonly messagingWriteRepository: MessagingWriteRepository,
    private readonly discordGatewayFactory: DiscordGatewayFactory,
    private readonly discordRecipientResolver: DiscordRecipientResolverPort,
  ) {}

  async execute(teacherId: number, input: BulkDmInput) {
    const { content } = input;

    if (input.class_id !== undefined) {
      const recipients = await this.messagingWriteRepository.listBulkDmRecipientContextsByClass(
        teacherId,
        input.class_id,
      );

      if (recipients.length === 0) {
        throw new ServiceError('at least one recipient is required', 400);
      }

      return this.deliverBulkDm(teacherId, content, recipients);
    }

    const studentIds = normalizeIdArray(input.student_ids);
    const recipients = await this.messagingWriteRepository.listBulkDmRecipientContextsByStudentIds(
      teacherId,
      studentIds,
    );
    if (recipients.length !== studentIds.length) {
      throw new ServiceError('some students are invalid', 404);
    }

    return this.deliverBulkDm(teacherId, content, recipients);
  }

  private async deliverBulkDm(
    teacherId: number,
    content: string,
    recipients: Awaited<ReturnType<MessagingWriteRepository['listBulkDmRecipientContextsByClass']>>,
  ) {
    const deliveryResults: Array<{
      student_id: number;
      student_name: string;
      status: DiscordSendStatus;
      sent_at: Date | null;
      error_detail: string | null;
    }> = [];

    for (const recipient of recipients) {
      if (!recipient.active_class_id) {
        deliveryResults.push({
          student_id: recipient.student_id,
          student_name: recipient.student_name,
          status: DiscordSendStatus.Failed,
          sent_at: null,
          error_detail: 'student is not in an active class',
        });
        continue;
      }

      const server = recipient.discord_server;
      if (!server) {
        deliveryResults.push({
          student_id: recipient.student_id,
          student_name: recipient.student_name,
          status: DiscordSendStatus.Failed,
          sent_at: null,
          error_detail: 'discord server is not configured for this class',
        });
        continue;
      }

      const resolvedRecipient = await this.discordRecipientResolver.resolve(
        server,
        recipient.discord_username,
      );
      if (!resolvedRecipient.userId) {
        deliveryResults.push({
          student_id: recipient.student_id,
          student_name: recipient.student_name,
          status: DiscordSendStatus.Failed,
          sent_at: null,
          error_detail: resolvedRecipient.error ?? 'failed to resolve discord_username',
        });
        continue;
      }

      try {
        await this.discordGatewayFactory.create(server.bot_token).sendDirectMessage({
          recipientUserId: resolvedRecipient.userId,
          content,
        });
        deliveryResults.push({
          student_id: recipient.student_id,
          student_name: recipient.student_name,
          status: DiscordSendStatus.Sent,
          sent_at: new Date(),
          error_detail: null,
        });
      } catch (error) {
        deliveryResults.push({
          student_id: recipient.student_id,
          student_name: recipient.student_name,
          status: DiscordSendStatus.Failed,
          sent_at: null,
          error_detail: toFailureMessage(error, 'failed to send DM'),
        });
      }
    }

    const { message, recipients: savedRecipients } =
      await this.messagingWriteRepository.createMessageWithRecipients({
        messageValues: {
          teacher_id: teacherId,
          type: DiscordMessageType.BulkDm,
          content,
          server_id: null,
        },
        recipientValues: deliveryResults.map((result) => ({
          teacher_id: teacherId,
          student_id: result.student_id,
          status: result.status,
          sent_at: result.sent_at,
          error_detail: result.error_detail,
        })),
      });

    const sentCount = savedRecipients.filter((recipient) => recipient.status === DiscordSendStatus.Sent).length;

    return {
      message,
      recipients_total: savedRecipients.length,
      sent: sentCount,
      failed: savedRecipients.length - sentCount,
      failures: deliveryResults
        .filter((result) => result.status === DiscordSendStatus.Failed)
        .map((result) => ({
          student_id: result.student_id,
          student_name: result.student_name,
          error: result.error_detail ?? 'unknown delivery error',
        })),
    };
  }
}
