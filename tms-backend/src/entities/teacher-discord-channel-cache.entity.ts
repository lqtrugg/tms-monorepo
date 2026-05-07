import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Teacher } from './teacher.entity.js';

@Entity('teacher_discord_channel_caches')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_teacher_discord_channel_caches_teacher_id',
  onDelete: 'CASCADE',
})
@Unique('uq_teacher_discord_channel_caches_channel', ['teacher_id', 'discord_channel_id'])
@Index('idx_teacher_discord_channel_caches_teacher_id', ['teacher_id'])
@Index('idx_teacher_discord_channel_caches_server_id', ['teacher_id', 'discord_server_id'])
@Check('chk_teacher_discord_channel_caches_type', `"type" IN ('text', 'voice')`)
export class TeacherDiscordChannelCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'varchar', length: 50 })
  discord_server_id!: string;

  @Column({ type: 'varchar', length: 50 })
  discord_channel_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: 'text' | 'voice';

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  synced_at!: Date;
}
