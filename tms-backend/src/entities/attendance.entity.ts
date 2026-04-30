import { Check, Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import { AttendanceSource, AttendanceStatus } from './enums.js';
import { Session } from './session.entity.js';
import { Student } from './student.entity.js';
import { Teacher } from './teacher.entity.js';

@Entity('attendance')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_attendance_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Session, ['session_id'], ['id'], {
  name: 'fk_attendance_session_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Student, ['student_id'], ['id'], {
  name: 'fk_attendance_student_id',
  onDelete: 'RESTRICT',
})
@Unique('uq_attendance_session_student', ['session_id', 'student_id'])
@Index('idx_attendance_teacher_id', ['teacher_id'])
@Index('idx_attendance_session_id', ['session_id'])
@Index('idx_attendance_student_id', ['student_id'])
@Check(
  'chk_attendance_override',
  "(source = 'manual' AND overridden_at IS NOT NULL) OR (source IN ('bot', 'system') AND overridden_at IS NULL)",
)
export class Attendance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  session_id!: number;

  @Column({ type: 'integer' })
  student_id!: number;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    enumName: 'attendance_status',
  })
  status!: AttendanceStatus;

  @Column({
    type: 'enum',
    enum: AttendanceSource,
    enumName: 'attendance_source',
    default: AttendanceSource.System,
  })
  source!: AttendanceSource;

  @Column({ type: 'timestamptz', nullable: true })
  overridden_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
