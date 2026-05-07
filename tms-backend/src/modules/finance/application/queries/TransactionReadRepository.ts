import type { TransactionType } from '../../../../entities/enums.js';

export interface TransactionReadRepository {
  findOwnedStudent(teacherId: number, studentId: number): Promise<boolean>;
  listTransactions(
    teacherId: number,
    filters: {
      student_id?: number;
      type?: TransactionType;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    items: unknown[];
    total: number;
    limit: number | null;
    offset: number;
  }>;
  listTransactionAuditLogs(teacherId: number, transactionId: number): Promise<unknown[]>;
  listFeeRecords(
    teacherId: number,
    filters: {
      student_id?: number;
      session_id?: number;
      status?: import('../../../../entities/enums.js').FeeRecordStatus;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    items: unknown[];
    total: number;
    limit: number | null;
    offset: number;
  }>;
  listStudentBalances(
    teacherId: number,
    filters: {
      status?: import('../../../../entities/enums.js').StudentStatus;
      include_pending_archive?: boolean;
    },
  ): Promise<unknown[]>;
  getFinanceSummary(
    teacherId: number,
    filters: {
      from?: Date;
      to?: Date;
      class_ids?: number[];
      include_unpaid?: boolean;
    },
  ): Promise<{
    total_payments: string;
    total_refunds: string;
    total_active_fees: string;
    unpaid_total: string;
    net_revenue: string;
    projected_revenue: string;
  }>;
}
