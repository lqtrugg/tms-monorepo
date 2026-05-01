import {
  StudentStatus,
  TopicStanding,
} from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import { getFinanceSummary, listStudentBalances } from '../finance/index.js';
import {
  countActiveClasses,
  countActiveEnrollmentsByClass,
  countActiveStudents,
  findReportClasses,
  findClassesByIds,
  findOwnedStudent,
  findStudentTopicStandings,
  findStudentTransactions,
  findTopicProblemsByIds,
  findTopicsByIds,
  getRevenueTotalsBetween,
} from './reporting.repository.js';

function parseAmountToBigInt(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  return BigInt(value);
}

export async function getDashboardSummary(teacherId: number) {
  const [activeStudents, activeClasses] = await Promise.all([
    countActiveStudents(teacherId),
    countActiveClasses(teacherId),
  ]);

  const balances = await listStudentBalances(teacherId, {
    status: StudentStatus.Active,
    include_pending_archive: false,
  });

  const totalDebt = balances.reduce((sum, balance) => {
    const amount = parseAmountToBigInt(balance.balance);
    if (amount < 0n) {
      return sum + amount * -1n;
    }

    return sum;
  }, 0n);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const now = new Date();
  const revenueQuery = await getRevenueTotalsBetween(teacherId, monthStart, now);

  const monthRevenue = parseAmountToBigInt(revenueQuery?.payments) - parseAmountToBigInt(revenueQuery?.refunds);

  return {
    active_students: activeStudents,
    active_classes: activeClasses,
    total_debt: totalDebt.toString(),
    monthly_revenue: monthRevenue.toString(),
  };
}

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

  const classStats = activeClasses.map((classItem) => {
    return {
      class_id: classItem.id,
      class_name: classItem.name,
      student_count: studentCountsByClass.get(classItem.id) ?? 0,
      fee_per_session: classItem.fee_per_session,
    };
  });

  return {
    summary,
    class_stats: classStats,
  };
}

export async function getStudentLearningProfile(teacherId: number, studentId: number) {
  const student = await findOwnedStudent(teacherId, studentId);

  if (!student) {
    throw new ServiceError('student not found', 404);
  }

  const standings = await findStudentTopicStandings(teacherId, studentId);

  if (standings.length === 0) {
    return {
      student,
      topics: [],
    };
  }

  const topicIds = Array.from(new Set(standings.map((item) => item.topic_id)));
  const problemIds = Array.from(new Set(standings.map((item) => item.problem_id)));

  const [topics, problems] = await Promise.all([
    findTopicsByIds(teacherId, topicIds),
    findTopicProblemsByIds(teacherId, problemIds),
  ]);

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));

  const classIds = Array.from(new Set(topics.map((topic) => topic.class_id)));
  const classes = await findClassesByIds(teacherId, classIds);
  const classNameById = new Map(classes.map((item) => [item.id, item.name]));

  const groupedByTopic = new Map<number, TopicStanding[]>();
  standings.forEach((standing) => {
    const list = groupedByTopic.get(standing.topic_id);
    if (list) {
      list.push(standing);
      return;
    }

    groupedByTopic.set(standing.topic_id, [standing]);
  });

  const topicRows = Array.from(groupedByTopic.entries())
    .map(([topicId, rows]) => {
      const topic = topicById.get(topicId);
      if (!topic) {
        return null;
      }

      const uniqueProblemIds = new Set<number>();
      let solvedCount = 0;
      let latestPulledAt: Date | null = null;

      const problemRows = rows.map((row) => {
        uniqueProblemIds.add(row.problem_id);
        if (row.solved) {
          solvedCount += 1;
        }

        if (!latestPulledAt || row.pulled_at.getTime() > latestPulledAt.getTime()) {
          latestPulledAt = row.pulled_at;
        }

        const problem = problemById.get(row.problem_id);
        return {
          problem_id: row.problem_id,
          problem_index: problem?.problem_index ?? '',
          problem_name: problem?.problem_name ?? null,
          solved: row.solved,
          penalty_minutes: row.penalty_minutes,
          pulled_at: row.pulled_at,
        };
      });

      problemRows.sort((a, b) => a.problem_index.localeCompare(b.problem_index, 'vi'));

      return {
        topic_id: topic.id,
        topic_title: topic.title,
        class_id: topic.class_id,
        class_name: classNameById.get(topic.class_id) ?? `Lớp #${topic.class_id}`,
        gym_link: topic.gym_link,
        gym_id: topic.gym_id,
        closed_at: topic.closed_at,
        solved_count: solvedCount,
        total_problems: uniqueProblemIds.size,
        last_pulled_at: latestPulledAt,
        problems: problemRows,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.topic_title.localeCompare(b.topic_title, 'vi'));

  const transactions = await findStudentTransactions(teacherId, studentId);

  return {
    student,
    topics: topicRows,
    transactions,
  };
}
