import { In, IsNull } from 'typeorm';

import { AppDataSource } from '../data-source.js';
import {
  Class,
  DiscordMessage,
  DiscordMessageRecipient,
  DiscordMessageType,
  DiscordSendStatus,
  DiscordServer,
  Enrollment,
  Student,
} from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';

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

export async function listDiscordServers(teacherId: number) {
  return AppDataSource.getRepository(DiscordServer).find({
    where: {
      teacher_id: teacherId,
    },
    order: {
      id: 'DESC',
    },
  });
}

export async function upsertDiscordServerByClass(teacherId: number, classId: number, input: {
  discord_server_id: string;
  name?: string | null;
  attendance_voice_channel_id?: string | null;
  notification_channel_id?: string | null;
}) {
  await requireOwnedClass(teacherId, classId);

  const repo = AppDataSource.getRepository(DiscordServer);
  const existing = await repo.findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });

  if (existing) {
    existing.discord_server_id = input.discord_server_id.trim();
    existing.name = input.name?.trim() || null;
    existing.attendance_voice_channel_id = input.attendance_voice_channel_id?.trim() || null;
    existing.notification_channel_id = input.notification_channel_id?.trim() || null;
    return repo.save(existing);
  }

  const server = repo.create({
    teacher_id: teacherId,
    class_id: classId,
    discord_server_id: input.discord_server_id.trim(),
    name: input.name?.trim() || null,
    attendance_voice_channel_id: input.attendance_voice_channel_id?.trim() || null,
    notification_channel_id: input.notification_channel_id?.trim() || null,
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

  return messages.map((message) => ({
    ...message,
    recipients: countMap.get(message.id) ?? { total: 0, sent: 0, failed: 0 },
  }));
}

export async function sendBulkDm(teacherId: number, input: {
  content: string;
  student_ids?: number[];
  class_id?: number;
}) {
  return AppDataSource.transaction(async (manager) => {
    let studentIds = input.student_ids ?? [];

    if (input.class_id !== undefined) {
      await requireOwnedClass(teacherId, input.class_id);

      const enrollments = await manager.getRepository(Enrollment).find({
        where: {
          teacher_id: teacherId,
          class_id: input.class_id,
          unenrolled_at: IsNull(),
        },
      });
      studentIds = Array.from(new Set(enrollments.map((item) => item.student_id)));
    }

    studentIds = Array.from(new Set(studentIds.filter((item) => Number.isInteger(item) && item > 0)));
    if (studentIds.length === 0) {
      throw new ServiceError('at least one recipient is required', 400);
    }

    const students = await manager.getRepository(Student).findBy({
      teacher_id: teacherId,
      id: In(studentIds),
    });

    if (students.length !== studentIds.length) {
      throw new ServiceError('some students are invalid', 404);
    }

    const messageRepo = manager.getRepository(DiscordMessage);
    const recipientRepo = manager.getRepository(DiscordMessageRecipient);

    const message = messageRepo.create({
      teacher_id: teacherId,
      type: DiscordMessageType.BulkDm,
      content: input.content.trim(),
      server_id: null,
    });
    const savedMessage = await messageRepo.save(message);

    const now = new Date();
    const recipients = students.map((student) => recipientRepo.create({
      teacher_id: teacherId,
      discord_message_id: savedMessage.id,
      student_id: student.id,
      status: DiscordSendStatus.Sent,
      sent_at: now,
      error_detail: null,
    }));
    await recipientRepo.save(recipients);

    return {
      message: savedMessage,
      recipients_total: recipients.length,
      sent: recipients.length,
      failed: 0,
    };
  });
}
