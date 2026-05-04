import { getFinanceSummary } from '../finance.service.js';
import {
  countActiveEnrollmentsByClass,
  findReportClasses,
} from './finance-report.repository.js';

export async function getIncomeReport(teacherId: number, filters: {
  from?: Date;
  to?: Date;
  class_ids?: number[];
  include_unpaid?: boolean;
}) {
  const summary = await getFinanceSummary(teacherId, filters);
  const activeClasses = await findReportClasses(teacherId, filters.class_ids);
  const classIds = activeClasses.map((classItem) => classItem.id);
  const studentCountsByClass = await countActiveEnrollmentsByClass(teacherId, classIds);

  const classStats = activeClasses.map((classItem) => ({
    class_id: classItem.id,
    class_name: classItem.name,
    student_count: studentCountsByClass.get(classItem.id) ?? 0,
    fee_per_session: classItem.fee_per_session,
  }));

  return {
    summary,
    class_stats: classStats,
  };
}
