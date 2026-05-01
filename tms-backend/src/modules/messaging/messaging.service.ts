import { In, IsNull } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Class,
  DiscordMessage,
  DiscordMessageRecipient,
  DiscordMessageType,
  DiscordSendStatus,
  DiscordServer,
  Enrollment,
  Student,
} from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  ensureDiscordChannelBelongsToGuild,
  fetchDiscordGuildMetadata,
  postDiscordChannelMessage,
  searchDiscordGuildMembers,
  sendDiscordDirectMessage,
  type DiscordGuildMemberIdentity,
} from '../../integrations/discord/discord-api.service.js';

async function requireOwnedClass(teacherId: number, classId: number): Promise<Class> {
  const classEntity = await AppDataSource.getRepository(Class).findOneBy({
    id: classId,
    teacher_id: teacherId,
  });

  if (!classEntity) {
    throw new ServiceError('class not found', 404);
  }

  return classEntity;
}

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

function parseDiscordUserId(discordUsername: string | null): string | null {
  if (typeof discordUsername !== 'string') {
    return null;
  }

  const normalized = discordUsername.trim();
  if (!normalized) {
    return null;
  }

  const mentionMatch = /^<@!?(\d{15,25})>$/.exec(normalized);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  if (/^\d{15,25}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

function normalizeDiscordName(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

function parseUsernameWithDiscriminator(value: string): { username: string; discriminator: string } | null {
  const match = /^(.+?)#(\d{4})$/.exec(value.trim().replace(/^@/, ''));
  if (!match) {
    return null;
  }

  return {
    username: match[1].trim().toLowerCase(),
    discriminator: match[2],
  };
}

function pickMemberByUsername(
  members: DiscordGuildMemberIdentity[],
  discordUsername: string,
): { userId: string | null; error: string | null } {
  const normalized = normalizeDiscordName(discordUsername);
  const withDiscriminator = parseUsernameWithDiscriminator(discordUsername);

  if (withDiscriminator) {
    const exactByTag = members.filter((member) => (
      member.username?.toLowerCase() === withDiscriminator.username
      && member.discriminator === withDiscriminator.discriminator
    ));

    if (exactByTag.length === 1) {
      return { userId: exactByTag[0].user_id, error: null };
    }

    if (exactByTag.length > 1) {
      return { userId: null, error: 'discord_username is ambiguous in this server' };
    }
  }

  const exactMatches = members.filter((member) => (
    member.username?.toLowerCase() === normalized
    || member.global_name?.toLowerCase() === normalized
    || member.nick?.toLowerCase() === normalized
  ));

  if (exactMatches.length === 1) {
    return { userId: exactMatches[0].user_id, error: null };
  }

  if (exactMatches.length > 1) {
    return { userId: null, error: 'discord_username is ambiguous in this server' };
  }

  if (members.length === 1) {
    return { userId: members[0].user_id, error: null };
  }

  return { userId: null, error: 'discord_username not found in this server' };
}

async function resolveDiscordRecipientUserId(input: {
  server: DiscordServer;
  discordUsername: string | null;
  cache: Map<string, { userId: string | null; error: string | null }>;
}): Promise<{ userId: string | null; error: string | null }> {
  const rawDiscordUsername = input.discordUsername?.trim() ?? '';
  if (!rawDiscordUsername) {
    return {
      userId: null,
      error: 'discord_username is required',
    };
  }

  const directUserId = parseDiscordUserId(rawDiscordUsername);
  if (directUserId) {
    return { userId: directUserId, error: null };
  }

  const normalizedLookupKey = `${input.server.id}:${normalizeDiscordName(rawDiscordUsername)}`;
  const cached = input.cache.get(normalizedLookupKey);
  if (cached) {
    return cached;
  }

  if (!input.server.bot_token) {
    const result = {
      userId: null,
      error: 'bot_token is missing for this class server',
    };
    input.cache.set(normalizedLookupKey, result);
    return result;
  }

  const tag = parseUsernameWithDiscriminator(rawDiscordUsername);
  const query = tag ? tag.username : rawDiscordUsername.trim().replace(/^@/, '');
  let members: DiscordGuildMemberIdentity[];
  try {
    members = await searchDiscordGuildMembers({
      guildId: input.server.discord_server_id,
      query,
      botToken: input.server.bot_token,
      limit: 25,
    });
  } catch (error) {
    const result = {
      userId: null,
      error: toFailureMessage(error, 'failed to resolve discord_username'),
    };
    input.cache.set(normalizedLookupKey, result);
    return result;
  }

  const resolved = pickMemberByUsername(members, rawDiscordUsername);
  input.cache.set(normalizedLookupKey, resolved);
  return resolved;
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
  const servers = await AppDataSource.getRepository(DiscordServer).find({
    where: {
      teacher_id: teacherId,
    },
    order: {
      id: 'DESC',
    },
  });

  return servers.map((server) => ({
    ...server,
    bot_token: null,
  }));
}

export async function deleteDiscordServer(teacherId: number, classId: number) {
  await requireOwnedClass(teacherId, classId);

  const repo = AppDataSource.getRepository(DiscordServer);
  const existing = await repo.findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });

  if (!existing) {
    throw new ServiceError('discord server not found for this class', 404);
  }

  await repo.remove(existing);

  return { removed: true };
}

export async function upsertDiscordServerByClass(teacherId: number, classId: number, input: {
  discord_server_id: string;
  bot_token?: string | null;
  attendance_voice_channel_id?: string | null;
  notification_channel_id?: string | null;
}) {
  await requireOwnedClass(teacherId, classId);

  const repo = AppDataSource.getRepository(DiscordServer);
  const existing = await repo.findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });
  const discordServerId = input.discord_server_id.trim();
  const providedBotToken = normalizeBotToken(input.bot_token);
  const botToken = providedBotToken ?? normalizeBotToken(existing?.bot_token) ?? null;

  if (!botToken) {
    throw new ServiceError('bot_token is required', 400);
  }

  const guild = await fetchDiscordGuildMetadata(discordServerId, botToken);
  const syncedServerId = guild.id.trim();
  const syncedName = guild.name;
  const attendanceVoiceChannelId = input.attendance_voice_channel_id?.trim() || null;
  const notificationChannelId = input.notification_channel_id?.trim() || null;

  if (attendanceVoiceChannelId) {
    await ensureDiscordChannelBelongsToGuild({
      channelId: attendanceVoiceChannelId,
      guildId: syncedServerId,
      botToken,
      fieldName: 'attendance_voice_channel_id',
    });
  }

  if (notificationChannelId) {
    await ensureDiscordChannelBelongsToGuild({
      channelId: notificationChannelId,
      guildId: syncedServerId,
      botToken,
      fieldName: 'notification_channel_id',
    });
  }

  if (existing) {
    existing.discord_server_id = syncedServerId;
    existing.bot_token = botToken;
    existing.name = syncedName;
    existing.attendance_voice_channel_id = attendanceVoiceChannelId;
    existing.notification_channel_id = notificationChannelId;
    return repo.save(existing);
  }

  const server = repo.create({
    teacher_id: teacherId,
    class_id: classId,
    discord_server_id: syncedServerId,
    bot_token: botToken,
    name: syncedName,
    attendance_voice_channel_id: attendanceVoiceChannelId,
    notification_channel_id: notificationChannelId,
  });

  return repo.save(server);
}

export async function listMessages(teacherId: number, filters: {
  type?: DiscordMessageType;
}) {
  const where = {
    teacher_id: teacherId,
    ...(filters.type ? { type: filters.type } : {}),
  };

  const messages = await AppDataSource.getRepository(DiscordMessage).find({
    where,
    order: {
      created_at: 'DESC',
    },
  });

  if (messages.length === 0) {
    return [];
  }

  const messageIds = messages.map((message) => message.id);
  const recipientCounts = await AppDataSource.getRepository(DiscordMessageRecipient)
    .createQueryBuilder('recipient')
    .select('recipient.discord_message_id', 'message_id')
    .addSelect('COUNT(*)', 'total')
    .addSelect("COUNT(*) FILTER (WHERE recipient.status = 'sent')", 'sent')
    .addSelect("COUNT(*) FILTER (WHERE recipient.status = 'failed')", 'failed')
    .where('recipient.teacher_id = :teacherId', { teacherId })
    .andWhere('recipient.discord_message_id IN (:...messageIds)', { messageIds })
    .groupBy('recipient.discord_message_id')
    .getRawMany<{ message_id: string; total: string; sent: string; failed: string }>();

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

  const failedRecipients = await AppDataSource.getRepository(DiscordMessageRecipient)
    .createQueryBuilder('recipient')
    .leftJoin(Student, 'student', 'student.id = recipient.student_id AND student.teacher_id = recipient.teacher_id')
    .select('recipient.discord_message_id', 'message_id')
    .addSelect('recipient.student_id', 'student_id')
    .addSelect('student.full_name', 'student_name')
    .addSelect('recipient.error_detail', 'error_detail')
    .where('recipient.teacher_id = :teacherId', { teacherId })
    .andWhere('recipient.discord_message_id IN (:...messageIds)', { messageIds })
    .andWhere('recipient.status = :status', { status: DiscordSendStatus.Failed })
    .orderBy('student.full_name', 'ASC')
    .getRawMany<{
      message_id: string;
      student_id: string;
      student_name: string | null;
      error_detail: string | null;
    }>();
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
  const content = input.content.trim();
  if (!content) {
    throw new ServiceError('content is required', 400);
  }

  let studentIds = normalizeIdArray(input.student_ids);
  if (input.class_id !== undefined) {
    await requireOwnedClass(teacherId, input.class_id);
    const enrollments = await AppDataSource.getRepository(Enrollment).find({
      where: {
        teacher_id: teacherId,
        class_id: input.class_id,
        unenrolled_at: IsNull(),
      },
    });
    studentIds = Array.from(new Set(enrollments.map((item) => item.student_id)));
  }

  if (studentIds.length === 0) {
    throw new ServiceError('at least one recipient is required', 400);
  }

  const students = await AppDataSource.getRepository(Student).findBy({
    teacher_id: teacherId,
    id: In(studentIds),
  });
  if (students.length !== studentIds.length) {
    throw new ServiceError('some students are invalid', 404);
  }

  const studentById = new Map(students.map((student) => [student.id, student]));
  const orderedStudents = studentIds
    .map((studentId) => studentById.get(studentId))
    .filter((item): item is Student => item !== undefined);

  const activeEnrollments = await AppDataSource.getRepository(Enrollment).find({
    where: {
      teacher_id: teacherId,
      student_id: In(studentIds),
      unenrolled_at: IsNull(),
    },
  });
  const classIdByStudentId = new Map<number, number>();
  for (const enrollment of activeEnrollments) {
    if (!classIdByStudentId.has(enrollment.student_id)) {
      classIdByStudentId.set(enrollment.student_id, enrollment.class_id);
    }
  }

  const classIds = Array.from(new Set(Array.from(classIdByStudentId.values())));
  const servers = classIds.length === 0
    ? []
    : await AppDataSource.getRepository(DiscordServer).findBy({
      teacher_id: teacherId,
      class_id: In(classIds),
    });
  const serverByClassId = new Map(servers.map((server) => [server.class_id, server]));
  const resolvedUserIdCache = new Map<string, { userId: string | null; error: string | null }>();

  const deliveryResults: Array<{
    student_id: number;
    status: DiscordSendStatus;
    sent_at: Date | null;
    error_detail: string | null;
  }> = [];
  for (const student of orderedStudents) {
    const classId = classIdByStudentId.get(student.id);
    if (!classId) {
      deliveryResults.push({
        student_id: student.id,
        status: DiscordSendStatus.Failed,
        sent_at: null,
        error_detail: 'student is not in an active class',
      });
      continue;
    }

    const server = serverByClassId.get(classId);
    if (!server) {
      deliveryResults.push({
        student_id: student.id,
        status: DiscordSendStatus.Failed,
        sent_at: null,
        error_detail: 'discord server is not configured for this class',
      });
      continue;
    }

    if (!server.bot_token) {
      deliveryResults.push({
        student_id: student.id,
        status: DiscordSendStatus.Failed,
        sent_at: null,
        error_detail: 'bot_token is missing for this class server',
      });
      continue;
    }

    const resolvedRecipient = await resolveDiscordRecipientUserId({
      server,
      discordUsername: student.discord_username,
      cache: resolvedUserIdCache,
    });
    if (!resolvedRecipient.userId) {
      deliveryResults.push({
        student_id: student.id,
        status: DiscordSendStatus.Failed,
        sent_at: null,
        error_detail: resolvedRecipient.error ?? 'failed to resolve discord_username',
      });
      continue;
    }

    try {
      await sendDiscordDirectMessage({
        botToken: server.bot_token,
        recipientUserId: resolvedRecipient.userId,
        content,
      });
      deliveryResults.push({
        student_id: student.id,
        status: DiscordSendStatus.Sent,
        sent_at: new Date(),
        error_detail: null,
      });
    } catch (error) {
      deliveryResults.push({
        student_id: student.id,
        status: DiscordSendStatus.Failed,
        sent_at: null,
        error_detail: toFailureMessage(error, 'failed to send DM'),
      });
    }
  }

  return AppDataSource.transaction(async (manager) => {
    const messageRepo = manager.getRepository(DiscordMessage);
    const recipientRepo = manager.getRepository(DiscordMessageRecipient);

    const message = messageRepo.create({
      teacher_id: teacherId,
      type: DiscordMessageType.BulkDm,
      content,
      server_id: null,
    });
    const savedMessage = await messageRepo.save(message);

    const recipients = deliveryResults.map((result) => recipientRepo.create({
      teacher_id: teacherId,
      discord_message_id: savedMessage.id,
      student_id: result.student_id,
      status: result.status,
      sent_at: result.sent_at,
      error_detail: result.error_detail,
    }));
    await recipientRepo.save(recipients);

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
          student_name: studentById.get(result.student_id)?.full_name ?? `Học sinh #${result.student_id}`,
          error: result.error_detail ?? 'unknown delivery error',
        })),
    };
  });
}

export async function sendChannelPost(teacherId: number, input: {
  content: string;
  server_ids: number[];
}) {
  const content = input.content.trim();
  if (!content) {
    throw new ServiceError('content is required', 400);
  }

  const serverIds = normalizeIdArray(input.server_ids);
  if (serverIds.length === 0) {
    throw new ServiceError('at least one server is required', 400);
  }

  const serverRepo = AppDataSource.getRepository(DiscordServer);
  const servers = await serverRepo.findBy({
    teacher_id: teacherId,
    id: In(serverIds),
  });

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
      await ensureDiscordChannelBelongsToGuild({
        channelId: server.notification_channel_id,
        guildId: server.discord_server_id,
        botToken: server.bot_token,
        fieldName: 'notification_channel_id',
      });
      await postDiscordChannelMessage({
        botToken: server.bot_token,
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
    : await AppDataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(DiscordMessage);
      const messageEntities = successfulServers.map((server) => messageRepo.create({
        teacher_id: teacherId,
        type: DiscordMessageType.ChannelPost,
        content,
        server_id: server.id,
      }));

      return messageRepo.save(messageEntities);
    });

  return {
    messages: savedMessages,
    targets_total: orderedServers.length,
    sent: savedMessages.length,
    failed: failures.length,
    failures,
  };
}
