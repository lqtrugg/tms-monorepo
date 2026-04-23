import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Class } from './class.entity.js';
import { Teacher } from './teacher.entity.js';

@Entity('discord_servers')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_discord_servers_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Class, ['class_id'], ['id'], {
  name: 'fk_discord_servers_class_id',
  onDelete: 'RESTRICT',
})
@Unique('uq_discord_servers_class_id', ['class_id'])
@Unique('uq_discord_servers_server_id', ['teacher_id', 'discord_server_id'])
@Index('idx_discord_servers_teacher_id', ['teacher_id'])
export class DiscordServer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  class_id!: number;

  @Column({ type: 'varchar', length: 50 })
  discord_server_id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  attendance_voice_channel_id!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  notification_channel_id!: string | null;
}
