import { EntityManager, In } from 'typeorm';

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

export function classRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Class);
}

export function discordServerRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(DiscordServer);
}

export function discordMessageRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(DiscordMessage);
}

export function discordMessageRecipientRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(DiscordMessageRecipient);
}

export function studentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Student);
}

export function findOwnedClass(teacherId: number, classId: number): Promise<Class | null> {
  return classRepository().findOneBy({
    id: classId,
    teacher_id: teacherId,
  });
}

export function findDiscordServerByClass(
  teacherId: number,
  classId: number,
): Promise<DiscordServer | null> {
  return discordServerRepository().findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });
}

export function listDiscordServersForTeacher(teacherId: number): Promise<DiscordServer[]> {
  return discordServerRepository().find({
    where: {
      teacher_id: teacherId,
    },
    order: {
      id: 'DESC',
    },
  });
}

export function removeDiscordServer(server: DiscordServer): Promise<DiscordServer> {
  return discordServerRepository().remove(server);
}

export function createDiscordServer(values: Partial<DiscordServer>): DiscordServer {
  return discordServerRepository().create(values);
}

export function saveDiscordServer(server: DiscordServer): Promise<DiscordServer> {
  return discordServerRepository().save(server);
}

export function listMessagesForTeacher(teacherId: number, filters: {
  type?: DiscordMessageType;
}): Promise<DiscordMessage[]> {
  return discordMessageRepository().find({
    where: {
      teacher_id: teacherId,
      ...(filters.type ? { type: filters.type } : {}),
    },
    order: {
      created_at: 'DESC',
    },
  });
}

export function countRecipientsByMessageIds(
  teacherId: number,
  messageIds: number[],
): Promise<Array<{ message_id: string; total: string; sent: string; failed: string }>> {
  if (messageIds.length === 0) {
    return Promise.resolve([]);
  }

  return discordMessageRecipientRepository()
    .createQueryBuilder('recipient')
    .select('recipient.discord_message_id', 'message_id')
    .addSelect('COUNT(*)', 'total')
    .addSelect("COUNT(*) FILTER (WHERE recipient.status = 'sent')", 'sent')
    .addSelect("COUNT(*) FILTER (WHERE recipient.status = 'failed')", 'failed')
    .where('recipient.teacher_id = :teacherId', { teacherId })
    .andWhere('recipient.discord_message_id IN (:...messageIds)', { messageIds })
    .groupBy('recipient.discord_message_id')
    .getRawMany<{ message_id: string; total: string; sent: string; failed: string }>();
}

export function listFailedRecipientsByMessageIds(
  teacherId: number,
  messageIds: number[],
): Promise<Array<{
  message_id: string;
  student_id: string;
  student_name: string | null;
  error_detail: string | null;
}>> {
  if (messageIds.length === 0) {
    return Promise.resolve([]);
  }

  return discordMessageRecipientRepository()
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
}

export type BulkDmRecipientContext = {
  student_id: number;
  student_name: string;
  discord_username: string | null;
  active_class_id: number | null;
  discord_server: DiscordServer | null;
};

type BulkDmRecipientRow = {
  student_id: number | string;
  student_name: string;
  discord_username: string | null;
  active_class_id: number | string | null;
  server_id: number | string | null;
  server_class_id: number | string | null;
  discord_server_id: string | null;
  server_name: string | null;
  bot_token: string | null;
  attendance_voice_channel_id: string | null;
  notification_channel_id: string | null;
};

function toBulkDmRecipientContext(row: BulkDmRecipientRow, teacherId: number): BulkDmRecipientContext {
  const serverId = row.server_id === null ? null : Number(row.server_id);
  const serverClassId = row.server_class_id === null ? null : Number(row.server_class_id);
  const discordServer = serverId === null || serverClassId === null || row.discord_server_id === null
    ? null
    : discordServerRepository().create({
      id: serverId,
      teacher_id: teacherId,
      class_id: serverClassId,
      discord_server_id: row.discord_server_id,
      name: row.server_name,
      bot_token: row.bot_token,
      attendance_voice_channel_id: row.attendance_voice_channel_id,
      notification_channel_id: row.notification_channel_id,
    });

  return {
    student_id: Number(row.student_id),
    student_name: row.student_name,
    discord_username: row.discord_username,
    active_class_id: row.active_class_id === null ? null : Number(row.active_class_id),
    discord_server: discordServer,
  };
}

function bulkDmRecipientQuery(teacherId: number) {
  return studentRepository()
    .createQueryBuilder('student')
    .leftJoin(
      Enrollment,
      'active_enrollment',
      'active_enrollment.student_id = student.id AND active_enrollment.teacher_id = student.teacher_id AND active_enrollment.unenrolled_at IS NULL',
    )
    .leftJoin(
      DiscordServer,
      'discord_server',
      'discord_server.teacher_id = student.teacher_id AND discord_server.class_id = active_enrollment.class_id',
    )
    .select('student.id', 'student_id')
    .addSelect('student.full_name', 'student_name')
    .addSelect('student.discord_username', 'discord_username')
    .addSelect('active_enrollment.class_id', 'active_class_id')
    .addSelect('discord_server.id', 'server_id')
    .addSelect('discord_server.class_id', 'server_class_id')
    .addSelect('discord_server.discord_server_id', 'discord_server_id')
    .addSelect('discord_server.name', 'server_name')
    .addSelect('discord_server.bot_token', 'bot_token')
    .addSelect('discord_server.attendance_voice_channel_id', 'attendance_voice_channel_id')
    .addSelect('discord_server.notification_channel_id', 'notification_channel_id')
    .where('student.teacher_id = :teacherId', { teacherId });
}

export async function listBulkDmRecipientContextsByStudentIds(
  teacherId: number,
  studentIds: number[],
): Promise<BulkDmRecipientContext[]> {
  if (studentIds.length === 0) {
    return [];
  }

  const rows = await bulkDmRecipientQuery(teacherId)
    .andWhere('student.id IN (:...studentIds)', { studentIds })
    .getRawMany<BulkDmRecipientRow>();
  const contextByStudentId = new Map(
    rows.map((row) => {
      const context = toBulkDmRecipientContext(row, teacherId);
      return [context.student_id, context];
    }),
  );

  return studentIds
    .map((studentId) => contextByStudentId.get(studentId))
    .filter((context): context is BulkDmRecipientContext => context !== undefined);
}

export async function listBulkDmRecipientContextsByClass(
  teacherId: number,
  classId: number,
): Promise<BulkDmRecipientContext[]> {
  const rows = await bulkDmRecipientQuery(teacherId)
    .innerJoin(
      Enrollment,
      'class_enrollment',
      'class_enrollment.student_id = student.id AND class_enrollment.teacher_id = student.teacher_id AND class_enrollment.class_id = :classId AND class_enrollment.unenrolled_at IS NULL',
      { classId },
    )
    .orderBy('student.full_name', 'ASC')
    .addOrderBy('student.id', 'ASC')
    .getRawMany<BulkDmRecipientRow>();

  return rows.map((row) => toBulkDmRecipientContext(row, teacherId));
}

export function findDiscordServersByIds(teacherId: number, serverIds: number[]): Promise<DiscordServer[]> {
  if (serverIds.length === 0) {
    return Promise.resolve([]);
  }

  return discordServerRepository().findBy({
    teacher_id: teacherId,
    id: In(serverIds),
  });
}

export function createMessageWithRecipients(
  manager: EntityManager,
  messageValues: Partial<DiscordMessage>,
  recipientValues: Array<Partial<DiscordMessageRecipient>>,
): Promise<{ message: DiscordMessage; recipients: DiscordMessageRecipient[] }> {
  const messageRepo = discordMessageRepository(manager);
  const recipientRepo = discordMessageRecipientRepository(manager);

  return messageRepo.save(messageRepo.create(messageValues)).then(async (message) => {
    const recipients = recipientValues.map((recipient) => recipientRepo.create({
      ...recipient,
      discord_message_id: message.id,
    }));
    await recipientRepo.save(recipients);
    return { message, recipients };
  });
}

export function createChannelPostMessages(
  manager: EntityManager,
  values: Array<Partial<DiscordMessage>>,
): Promise<DiscordMessage[]> {
  const messageRepo = discordMessageRepository(manager);
  return messageRepo.save(values.map((value) => messageRepo.create(value)));
}
