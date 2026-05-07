import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Teacher } from './teacher.entity.js';

@Entity('teacher_discord_server_caches')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_teacher_discord_server_caches_teacher_id',
  onDelete: 'CASCADE',
})
@Unique('uq_teacher_discord_server_caches_server', ['teacher_id', 'discord_server_id'])
@Index('idx_teacher_discord_server_caches_teacher_id', ['teacher_id'])
export class TeacherDiscordServerCache {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'varchar', length: 50 })
  discord_server_id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  synced_at!: Date;
}
