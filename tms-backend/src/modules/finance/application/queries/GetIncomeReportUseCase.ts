import type { FinanceReportReadRepository } from './FinanceReportReadRepository.js';

export class GetIncomeReportUseCase {
  constructor(private readonly financeReportReadRepository: FinanceReportReadRepository) {}

  async execute(
    teacherId: number,
    filters: {
      from?: Date;
      to?: Date;
      class_ids?: number[];
      include_unpaid?: boolean;
    },
  ) {
    const summary = await this.financeReportReadRepository.getFinanceSummary(teacherId, filters);
    const activeClasses = await this.financeReportReadRepository.findReportClasses(
      teacherId,
      filters.class_ids,
    );
    const studentCountsByClass = await this.financeReportReadRepository.countActiveEnrollmentsByClass(
      teacherId,
      activeClasses.map((classItem) => classItem.id),
    );

    return {
      summary,
      class_stats: activeClasses.map((classItem) => ({
        class_id: classItem.id,
        class_name: classItem.name,
        student_count: studentCountsByClass.get(classItem.id) ?? 0,
        fee_per_session: classItem.fee_per_session,
      })),
    };
  }
}
