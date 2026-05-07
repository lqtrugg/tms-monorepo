import { EntityManager, In } from 'typeorm';

import { AppDataSource } from '../../../../../data-source.js';
import { DiscordMessageOrmEntity } from './DiscordMessageOrmEntity.js';
import { DiscordMessageRecipientOrmEntity } from './DiscordMessageRecipientOrmEntity.js';
import { DiscordServerOrmEntity } from './DiscordServerOrmEntity.js';
import { Enrollment } from '../../../../../entities/enrollment.entity.js';
import { Student } from '../../../../../entities/student.entity.js';
import type { DiscordMessage } from '../../../../../entities/discord-message.entity.js';
import type { DiscordMessageRecipient } from '../../../../../entities/discord-message-recipient.entity.js';
import type { DiscordServer } from '../../../../../entities/discord-server.entity.js';
import type {
  BulkDmRecipientContext,
  MessagingWriteRepository,
} from './MessagingWriteRepository.js';

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

function toBulkDmRecipientContext(
  row: BulkDmRecipientRow,
  teacherId: number,
  manager: EntityManager,
): BulkDmRecipientContext {
  const serverId = row.server_id === null ? null : Number(row.server_id);
  const serverClassId = row.server_class_id === null ? null : Number(row.server_class_id);
  const discordServer = serverId === null || serverClassId === null || row.discord_server_id === null
    ? null
    : manager.getRepository(DiscordServerOrmEntity).create({
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

function bulkDmRecipientQuery(manager: EntityManager, teacherId: number) {
  return manager.getRepository(Student)
    .createQueryBuilder('student')
    .leftJoin(
      Enrollment,
      'active_enrollment',
      'active_enrollment.student_id = student.id AND active_enrollment.teacher_id = student.teacher_id AND active_enrollment.unenrolled_at IS NULL',
    )
    .leftJoin(
      DiscordServerOrmEntity,
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

export class TypeOrmMessagingWriteRepository implements MessagingWriteRepository {
  constructor(private readonly manager: EntityManager = AppDataSource.manager) {}

  findDiscordServerByClass(teacherId: number, classId: number) {
    return this.manager.getRepository(DiscordServerOrmEntity).findOneBy({
      teacher_id: teacherId,
      class_id: classId,
    });
  }

  removeDiscordServer(server: DiscordServer) {
    return this.manager.getRepository(DiscordServerOrmEntity).remove(server);
  }

  createDiscordServer(values: Partial<DiscordServer>) {
    return this.manager.getRepository(DiscordServerOrmEntity).create(values);
  }

  saveDiscordServer(server: DiscordServer) {
    return this.manager.getRepository(DiscordServerOrmEntity).save(server);
  }

  async listBulkDmRecipientContextsByStudentIds(teacherId: number, studentIds: number[]) {
    if (studentIds.length === 0) {
      return [];
    }

    const rows = await bulkDmRecipientQuery(this.manager, teacherId)
      .andWhere('student.id IN (:...studentIds)', { studentIds })
      .getRawMany<BulkDmRecipientRow>();
    const contextByStudentId = new Map(
      rows.map((row) => {
        const context = toBulkDmRecipientContext(row, teacherId, this.manager);
        return [context.student_id, context];
      }),
    );

    return studentIds
      .map((studentId) => contextByStudentId.get(studentId))
      .filter((context): context is BulkDmRecipientContext => context !== undefined);
  }

  async listBulkDmRecipientContextsByClass(teacherId: number, classId: number) {
    const rows = await bulkDmRecipientQuery(this.manager, teacherId)
      .innerJoin(
        Enrollment,
        'class_enrollment',
        'class_enrollment.student_id = student.id AND class_enrollment.teacher_id = student.teacher_id AND class_enrollment.class_id = :classId AND class_enrollment.unenrolled_at IS NULL',
        { classId },
      )
      .orderBy('student.full_name', 'ASC')
      .addOrderBy('student.id', 'ASC')
      .getRawMany<BulkDmRecipientRow>();

    return rows.map((row) => toBulkDmRecipientContext(row, teacherId, this.manager));
  }

  findDiscordServersByIds(teacherId: number, serverIds: number[]) {
    if (serverIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.manager.getRepository(DiscordServerOrmEntity).findBy({
      teacher_id: teacherId,
      id: In(serverIds),
    });
  }

  createMessageWithRecipients(input: {
    messageValues: Partial<DiscordMessage>;
    recipientValues: Array<Partial<DiscordMessageRecipient>>;
  }) {
    return AppDataSource.transaction(async (transactionManager) => {
      const messageRepo = transactionManager.getRepository(DiscordMessageOrmEntity);
      const recipientRepo = transactionManager.getRepository(DiscordMessageRecipientOrmEntity);
      const message = await messageRepo.save(messageRepo.create(input.messageValues));
      const recipients = input.recipientValues.map((recipient) => recipientRepo.create({
        ...recipient,
        discord_message_id: message.id,
      }));
      await recipientRepo.save(recipients);
      return { message, recipients };
    });
  }

  createChannelPostMessages(values: Array<Partial<DiscordMessage>>) {
    return AppDataSource.transaction(async (transactionManager) => {
      const messageRepo = transactionManager.getRepository(DiscordMessageOrmEntity);
      return messageRepo.save(values.map((value) => messageRepo.create(value)));
    });
  }
}
