import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';

import { PendingArchiveReason, StudentStatus } from './enums.js';
import { Teacher } from './teacher.entity.js';

@Entity('students')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_students_teacher_id',
  onDelete: 'RESTRICT',
})
@Index('idx_students_teacher_id', ['teacher_id'])
@Index('idx_students_status', ['status'])
@Check(
  'chk_students_pending_archive_reason',
  "(status = 'pending_archive' AND pending_archive_reason IS NOT NULL) OR (status <> 'pending_archive' AND pending_archive_reason IS NULL)",
)
@Check(
  'chk_students_archived_at',
  "(status = 'archived' AND archived_at IS NOT NULL) OR (status <> 'archived' AND archived_at IS NULL)",
)
export class Student {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'varchar', length: 255 })
  full_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  codeforces_handle!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  discord_username!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    enumName: 'student_status',
    default: StudentStatus.Active,
  })
  status!: StudentStatus;

  @Column({
    type: 'enum',
    enum: PendingArchiveReason,
    enumName: 'pending_archive_reason',
    nullable: true,
  })
  pending_archive_reason!: PendingArchiveReason | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  archived_at!: Date | null;
}
