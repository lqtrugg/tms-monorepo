import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { DiscordSendStatus } from './enums.js';
import { DiscordMessage } from './discord-message.entity.js';
import { Student } from './student.entity.js';
import { Teacher } from './teacher.entity.js';

@Entity('discord_message_recipients')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_discord_message_recipients_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => DiscordMessage, ['discord_message_id'], ['id'], {
  name: 'fk_discord_message_recipients_discord_message_id',
  onDelete: 'CASCADE',
})
@ForeignKey(() => Student, ['student_id'], ['id'], {
  name: 'fk_discord_message_recipients_student_id',
  onDelete: 'RESTRICT',
})
@Unique('uq_discord_message_recipients', ['discord_message_id', 'student_id'])
@Index('idx_discord_message_recipients_teacher_id', ['teacher_id'])
@Index('idx_discord_message_recipients_discord_message_id', ['discord_message_id'])
@Index('idx_discord_message_recipients_student_id', ['student_id'])
@Check(
  'chk_discord_recipients_sent_at',
  "(status = 'sent' AND sent_at IS NOT NULL) OR (status <> 'sent' AND sent_at IS NULL)",
)
export class DiscordMessageRecipient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  discord_message_id!: number;

  @Column({ type: 'integer' })
  student_id!: number;

  @Column({
    type: 'enum',
    enum: DiscordSendStatus,
    enumName: 'discord_send_status',
    default: DiscordSendStatus.Pending,
  })
  status!: DiscordSendStatus;

  @Column({ type: 'timestamptz', nullable: true })
  sent_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  error_detail!: string | null;
}
