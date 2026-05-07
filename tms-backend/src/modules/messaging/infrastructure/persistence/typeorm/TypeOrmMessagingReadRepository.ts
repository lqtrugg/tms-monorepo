import { AppDataSource } from '../../../../../data-source.js';
import {
  DiscordSendStatus,
  Student,
} from '../../../../../entities/index.js';
import { DiscordMessageOrmEntity } from './DiscordMessageOrmEntity.js';
import { DiscordMessageRecipientOrmEntity } from './DiscordMessageRecipientOrmEntity.js';
import { DiscordServerOrmEntity } from './DiscordServerOrmEntity.js';
import type {
  FailedMessageRecipient,
  MessageRecipientCount,
  MessagingReadRepository,
} from '../../../application/queries/MessagingReadRepository.js';

export class TypeOrmMessagingReadRepository implements MessagingReadRepository {
  async listDiscordServersForTeacher(teacherId: number) {
    return AppDataSource.getRepository(DiscordServerOrmEntity).find({
      where: { teacher_id: teacherId },
      order: { id: 'DESC' },
    });
  }

  async listMessagesForTeacher(
    teacherId: number,
    filters: { type?: import('../../../../../entities/enums.js').DiscordMessageType },
  ) {
    return AppDataSource.getRepository(DiscordMessageOrmEntity).find({
      where: {
        teacher_id: teacherId,
        ...(filters.type ? { type: filters.type } : {}),
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async countRecipientsByMessageIds(teacherId: number, messageIds: number[]): Promise<MessageRecipientCount[]> {
    if (messageIds.length === 0) {
      return [];
    }

    return AppDataSource.getRepository(DiscordMessageRecipientOrmEntity)
      .createQueryBuilder('recipient')
      .select('recipient.discord_message_id', 'message_id')
      .addSelect('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE recipient.status = 'sent')", 'sent')
      .addSelect("COUNT(*) FILTER (WHERE recipient.status = 'failed')", 'failed')
      .where('recipient.teacher_id = :teacherId', { teacherId })
      .andWhere('recipient.discord_message_id IN (:...messageIds)', { messageIds })
      .groupBy('recipient.discord_message_id')
      .getRawMany<MessageRecipientCount>();
  }

  async listFailedRecipientsByMessageIds(
    teacherId: number,
    messageIds: number[],
  ): Promise<FailedMessageRecipient[]> {
    if (messageIds.length === 0) {
      return [];
    }

    return AppDataSource.getRepository(DiscordMessageRecipientOrmEntity)
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
      .getRawMany<FailedMessageRecipient>();
  }
}
