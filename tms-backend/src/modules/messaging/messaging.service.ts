import { AppDataSource } from '../../data-source.js';
import {
  DiscordMessageType,
  DiscordSendStatus,
  DiscordServer,
} from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  DiscordClient,
} from '../../integrations/discord/discord-api.service.js';
import { DiscordRecipientResolver } from '../../integrations/discord/discord-recipient-resolver.js';
import {
  countRecipientsByMessageIds,
  createChannelPostMessages,
  createDiscordServer,
  createMessageWithRecipients,
  findDiscordServerByClass,
  findDiscordServersByIds,
  listBulkDmRecipientContextsByClass,
  listBulkDmRecipientContextsByStudentIds,
  listDiscordServersForTeacher,
  listFailedRecipientsByMessageIds,
  listMessagesForTeacher,
  removeDiscordServer,
  saveDiscordServer,
  type BulkDmRecipientContext,
} from './messaging.repository.js';

function normalizeIdArray(values: number[] | undefined): number[] {
  if (!values) {
    return [];
  }

  return Array.from(new Set(values.filter((item) => Number.isInteger(item) && item > 0)));
}

function normalizeBotToken(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/^Bot\s+/i, '');
  return normalized.length > 0 ? normalized : null;
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

export async function listDiscordServers(teacherId: number) {
  const servers = await listDiscordServersForTeacher(teacherId);

  return servers.map((server) => ({
    ...server,
    bot_token: null,
  }));
}

export async function deleteDiscordServer(teacherId: number, classId: number) {
  const existing = await findDiscordServerByClass(teacherId, classId);

  if (!existing) {
    throw new ServiceError('discord server not found for this class', 404);
  }

  await removeDiscordServer(existing);

  return { removed: true };
}

export async function upsertDiscordServerByClass(teacherId: number, classId: number, input: {
  discord_server_id: string;
  bot_token?: string | null;
  attendance_voice_channel_id?: string | null;
  notification_channel_id?: string | null;
}) {
  const existing = await findDiscordServerByClass(teacherId, classId);
  const discordServerId = input.discord_server_id.trim();
  const providedBotToken = normalizeBotToken(input.bot_token);
  const botToken = providedBotToken ?? normalizeBotToken(existing?.bot_token) ?? null;

  if (!botToken) {
    throw new ServiceError('bot_token is required', 400);
  }

  const discord = new DiscordClient(botToken);
  const guild = await discord.fetchGuildMetadata(discordServerId);
  const syncedServerId = guild.id.trim();
  const syncedName = guild.name;
  const attendanceVoiceChannelId = input.attendance_voice_channel_id?.trim() || null;
  const notificationChannelId = input.notification_channel_id?.trim() || null;

  if (attendanceVoiceChannelId) {
    await discord.ensureChannelBelongsToGuild({
      channelId: attendanceVoiceChannelId,
      guildId: syncedServerId,
      fieldName: 'attendance_voice_channel_id',
    });
  }

  if (notificationChannelId) {
    await discord.ensureChannelBelongsToGuild({
      channelId: notificationChannelId,
      guildId: syncedServerId,
      fieldName: 'notification_channel_id',
    });
  }

  if (existing) {
    existing.discord_server_id = syncedServerId;
    existing.bot_token = botToken;
    existing.name = syncedName;
    existing.attendance_voice_channel_id = attendanceVoiceChannelId;
    existing.notification_channel_id = notificationChannelId;
    return saveDiscordServer(existing);
  }

  const server = createDiscordServer({
    teacher_id: teacherId,
    class_id: classId,
    discord_server_id: syncedServerId,
    bot_token: botToken,
    name: syncedName,
    attendance_voice_channel_id: attendanceVoiceChannelId,
    notification_channel_id: notificationChannelId,
  });

  return saveDiscordServer(server);
}

export async function listMessages(teacherId: number, filters: {
  type?: DiscordMessageType;
}) {
  const messages = await listMessagesForTeacher(teacherId, filters);

  if (messages.length === 0) {
    return [];
  }

  const messageIds = messages.map((message) => message.id);
  const recipientCounts = await countRecipientsByMessageIds(teacherId, messageIds);

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

  const failedRecipients = await listFailedRecipientsByMessageIds(teacherId, messageIds);
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

export async function sendBulkDm(teacherId: number, input: {
  content: string;
  student_ids?: number[];
  class_id?: number;
}) {
  const { content } = input;

  if (input.class_id !== undefined) {
    const recipients = await listBulkDmRecipientContextsByClass(teacherId, input.class_id);

    if (recipients.length === 0) {
      throw new ServiceError('at least one recipient is required', 400);
    }

    return deliverBulkDm(teacherId, content, recipients);
  }

  const studentIds = normalizeIdArray(input.student_ids);
  const recipients = await listBulkDmRecipientContextsByStudentIds(teacherId, studentIds);
  if (recipients.length !== studentIds.length) {
    throw new ServiceError('some students are invalid', 404);
  }

  return deliverBulkDm(teacherId, content, recipients);
}

async function deliverBulkDm(
  teacherId: number,
  content: string,
  recipients: BulkDmRecipientContext[],
) {
  const recipientResolver = new DiscordRecipientResolver();

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

    if (!server.bot_token) {
      deliveryResults.push({
        student_id: recipient.student_id,
        student_name: recipient.student_name,
        status: DiscordSendStatus.Failed,
        sent_at: null,
        error_detail: 'bot_token is missing for this class server',
      });
      continue;
    }

    const resolvedRecipient = await recipientResolver.resolve(server, recipient.discord_username);
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
      await new DiscordClient(server.bot_token).sendDirectMessage({
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

  return AppDataSource.transaction(async (manager) => {
    const { message: savedMessage, recipients } = await createMessageWithRecipients(
      manager,
      {
        teacher_id: teacherId,
        type: DiscordMessageType.BulkDm,
        content,
        server_id: null,
      },
      deliveryResults.map((result) => ({
        teacher_id: teacherId,
        student_id: result.student_id,
        status: result.status,
        sent_at: result.sent_at,
        error_detail: result.error_detail,
      })),
    );

    const sentCount = recipients.filter((recipient) => recipient.status === DiscordSendStatus.Sent).length;

    return {
      message: savedMessage,
      recipients_total: recipients.length,
      sent: sentCount,
      failed: recipients.length - sentCount,
      failures: deliveryResults
        .filter((result) => result.status === DiscordSendStatus.Failed)
        .map((result) => ({
          student_id: result.student_id,
          student_name: result.student_name,
          error: result.error_detail ?? 'unknown delivery error',
        })),
    };
  });
}

export async function sendChannelPost(teacherId: number, input: {
  content: string;
  server_ids: number[];
}) {
  const { content } = input;
  const serverIds = normalizeIdArray(input.server_ids);
  const servers = await findDiscordServersByIds(teacherId, serverIds);

  if (servers.length !== serverIds.length) {
    throw new ServiceError('some servers are invalid', 404);
  }

  const serverById = new Map(servers.map((server) => [server.id, server]));
  const orderedServers = serverIds
    .map((serverId) => serverById.get(serverId))
    .filter((item): item is DiscordServer => item !== undefined);

  const successfulServers: DiscordServer[] = [];
  const failures: Array<{ server_id: number; error: string }> = [];

  for (const server of orderedServers) {
    if (!server.bot_token) {
      failures.push({
        server_id: server.id,
        error: 'bot_token is missing',
      });
      continue;
    }

    if (!server.notification_channel_id) {
      failures.push({
        server_id: server.id,
        error: 'notification_channel_id is missing',
      });
      continue;
    }

    try {
      const discord = new DiscordClient(server.bot_token);
      await discord.ensureChannelBelongsToGuild({
        channelId: server.notification_channel_id,
        guildId: server.discord_server_id,
        fieldName: 'notification_channel_id',
      });
      await discord.postChannelMessage({
        channelId: server.notification_channel_id,
        content,
      });
      successfulServers.push(server);
    } catch (error) {
      failures.push({
        server_id: server.id,
        error: toFailureMessage(error, 'failed to send message'),
      });
    }
  }

  const savedMessages = successfulServers.length === 0
    ? []
    : await AppDataSource.transaction((manager) => createChannelPostMessages(
      manager,
      successfulServers.map((server) => ({
        teacher_id: teacherId,
        type: DiscordMessageType.ChannelPost,
        content,
        server_id: server.id,
      })),
    ));

  return {
    messages: savedMessages,
    targets_total: orderedServers.length,
    sent: savedMessages.length,
    failed: failures.length,
    failures,
  };
}
