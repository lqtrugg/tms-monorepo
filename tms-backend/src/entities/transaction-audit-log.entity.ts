import { Column, Entity, ForeignKey, Index, PrimaryGeneratedColumn } from 'typeorm';

import { TransactionType } from './enums.js';
import { Student } from './student.entity.js';
import { Teacher } from './teacher.entity.js';
import { Transaction } from './transaction.entity.js';

@Entity('transaction_audit_logs')
@ForeignKey(() => Teacher, ['teacher_id'], ['id'], {
  name: 'fk_transaction_audit_logs_teacher_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Transaction, ['transaction_id'], ['id'], {
  name: 'fk_transaction_audit_logs_transaction_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Student, ['old_student_id'], ['id'], {
  name: 'fk_transaction_audit_logs_old_student_id',
  onDelete: 'RESTRICT',
})
@ForeignKey(() => Student, ['new_student_id'], ['id'], {
  name: 'fk_transaction_audit_logs_new_student_id',
  onDelete: 'RESTRICT',
})
@Index('idx_transaction_audit_logs_teacher_id', ['teacher_id'])
@Index('idx_transaction_audit_logs_transaction_id', ['transaction_id'])
@Index('idx_transaction_audit_logs_created_at', ['created_at'])
export class TransactionAuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  teacher_id!: number;

  @Column({ type: 'integer' })
  transaction_id!: number;

  @Column({ type: 'integer' })
  old_student_id!: number;

  @Column({ type: 'integer' })
  new_student_id!: number;

  @Column({ type: 'numeric', precision: 12, scale: 0 })
  old_amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 0 })
  new_amount!: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'transaction_type',
  })
  old_type!: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionType,
    enumName: 'transaction_type',
  })
  new_type!: TransactionType;

  @Column({ type: 'timestamptz' })
  old_recorded_at!: Date;

  @Column({ type: 'timestamptz' })
  new_recorded_at!: Date;

  @Column({ type: 'text', nullable: true })
  old_notes!: string | null;

  @Column({ type: 'text', nullable: true })
  new_notes!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  created_at!: Date;
}
