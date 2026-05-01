import type { Student } from '../../../entities/index.js';
import type { StudentBalanceSnapshot, StudentSummary } from './student.types.js';

export function toStudentSummary(
  student: Student,
  context: {
    current_class_id: number | null;
    current_enrollment_id: number | null;
    balance_snapshot: StudentBalanceSnapshot;
  },
): StudentSummary {
  return {
    id: student.id,
    teacher_id: student.teacher_id,
    full_name: student.full_name,
    codeforces_handle: student.codeforces_handle,
    discord_username: student.discord_username,
    phone: student.phone,
    note: student.note,
    status: student.status,
    pending_archive_reason: student.pending_archive_reason,
    created_at: student.created_at,
    archived_at: student.archived_at,
    current_class_id: context.current_class_id,
    current_enrollment_id: context.current_enrollment_id,
    transactions_total: context.balance_snapshot.transactions_total,
    active_fee_total: context.balance_snapshot.active_fee_total,
    balance: context.balance_snapshot.balance,
  };
}
