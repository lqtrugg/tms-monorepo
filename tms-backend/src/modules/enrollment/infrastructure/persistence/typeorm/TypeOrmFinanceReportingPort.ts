import { FinanceReadService, TypeOrmTransactionReadRepository } from '../../../../finance/index.js';
import type {
  FinanceReportingPort,
  FinanceSummaryView,
  StudentBalanceRow,
  StudentTransactionListView,
} from '../../../application/ports/FinanceReportingPort.js';

const financeReadService = new FinanceReadService(new TypeOrmTransactionReadRepository());

export class TypeOrmFinanceReportingPort implements FinanceReportingPort {
  getFinanceSummary(input: {
    teacherId: number;
    from: Date;
    to: Date;
    includeUnpaid: boolean;
  }): Promise<FinanceSummaryView> {
    return financeReadService.getFinanceSummary(input.teacherId, {
      from: input.from,
      to: input.to,
      include_unpaid: input.includeUnpaid,
    });
  }

  listStudentBalances(input: {
    teacherId: number;
    status: string;
    includePendingArchive: boolean;
  }): Promise<StudentBalanceRow[]> {
    return financeReadService.listStudentBalances(input.teacherId, {
      status: input.status as never,
      include_pending_archive: input.includePendingArchive,
    }) as Promise<StudentBalanceRow[]>;
  }

  listTransactions(input: {
    teacherId: number;
    studentId: number;
  }): Promise<StudentTransactionListView> {
    return financeReadService.listTransactions(input.teacherId, { student_id: input.studentId });
  }
}
