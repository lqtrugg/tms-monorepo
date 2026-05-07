import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { Teacher } from './teacher.entity.js';

@Entity('teacher_community_servers')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_teacher_community_servers_teacher_id',
  onDelete: 'RESTRICT',
})
@Unique('uq_teacher_community_servers_teacher_id', ['teacher_id'])
@Unique('uq_teacher_community_servers_server_id', ['teacher_id', 'discord_server_id'])
@Index('idx_teacher_community_servers_teacher_id', ['teacher_id'])
export class TeacherCommunityServer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'varchar', length: 50 })
  discord_server_id!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  notification_channel_id!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voice_channel_id!: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at!: Date;
}
