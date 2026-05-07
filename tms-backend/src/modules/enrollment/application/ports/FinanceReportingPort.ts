export type StudentBalanceRow = {
  balance: string;
};

export type FinanceSummaryView = {
  net_revenue: string;
};

export type StudentTransactionListView = {
  items: unknown[];
};

export interface FinanceReportingPort {
  getFinanceSummary(input: {
    teacherId: number;
    from: Date;
    to: Date;
    includeUnpaid: boolean;
  }): Promise<FinanceSummaryView>;
  listStudentBalances(input: {
    teacherId: number;
    status: string;
    includePendingArchive: boolean;
  }): Promise<StudentBalanceRow[]>;
  listTransactions(input: {
    teacherId: number;
    studentId: number;
  }): Promise<StudentTransactionListView>;
}
