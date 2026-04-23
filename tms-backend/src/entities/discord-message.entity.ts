import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';

import { DiscordMessageType } from './enums.js';
import { DiscordServer } from './discord-server.entity.js';
import { Teacher } from './teacher.entity.js';

@Entity('discord_messages')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_discord_messages_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => DiscordServer, ['server_id'], ['id'], {
  name: 'fk_discord_messages_server_id',
  onDelete: 'SET NULL',
})
@Index('idx_discord_messages_teacher_id', ['teacher_id'])
@Index('idx_discord_messages_type', ['type'])
@Index('idx_discord_messages_created_at', ['created_at'])
@Check(
  'chk_discord_messages_server',
  "(type IN ('auto_notification', 'channel_post') AND server_id IS NOT NULL) OR (type = 'bulk_dm' AND server_id IS NULL)",
)
export class DiscordMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({
    type: 'enum',
    enum: DiscordMessageType,
    enumName: 'discord_message_type',
  })
  type!: DiscordMessageType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'integer', nullable: true })
  server_id!: number | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
