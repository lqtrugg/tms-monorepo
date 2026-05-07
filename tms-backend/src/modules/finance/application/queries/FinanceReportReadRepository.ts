export interface FinanceReportReadRepository {
  findReportClasses(
    teacherId: number,
    classIds?: number[],
  ): Promise<Array<{ id: number; name: string; fee_per_session: string }>>;
  countActiveEnrollmentsByClass(teacherId: number, classIds: number[]): Promise<Map<number, number>>;
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
