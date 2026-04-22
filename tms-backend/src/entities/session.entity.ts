import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';

import { Class } from './class.entity.js';
import { SessionStatus } from './enums.js';
import { Teacher } from './teacher.entity.js';

@Entity('sessions')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_sessions_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Class, ['class_id'], ['id'], {
  name: 'fk_sessions_class_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Teacher, ['cancelled_by'], ['id'], {
  name: 'fk_sessions_cancelled_by',
  onDelete: 'SET NULL',
})
@Index('idx_sessions_teacher_id', ['teacher_id'])
@Index('idx_sessions_class_id', ['class_id'])
@Index('idx_sessions_scheduled_at', ['scheduled_at'])
@Index('idx_sessions_status', ['status'])
@Check(
  'chk_sessions_cancelled',
  "(status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL) OR (status <> 'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL)",
)
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  class_id!: number;

  @Column({ type: 'timestamptz' })
  scheduled_at!: Date;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    enumName: 'session_status',
    default: SessionStatus.Scheduled,
  })
  status!: SessionStatus;

  @Column({ type: 'boolean', default: false })
  is_manual!: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at!: Date | null;

  @Column({ type: 'integer', nullable: true })
  cancelled_by!: number | null;
}
