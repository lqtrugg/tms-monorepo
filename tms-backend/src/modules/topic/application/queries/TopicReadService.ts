import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { TopicReadRepository } from './TopicReadRepository.js';

type TopicStatusFilter = 'active' | 'closed';

function normalizeTopicStatus(topic: { closed_at: Date | null }): TopicStatusFilter {
  return topic.closed_at ? 'closed' : 'active';
}

export class TopicReadService {
  constructor(private readonly topicReadRepository: TopicReadRepository) {}

  async listTopics(
    teacherId: number,
    filters: {
      class_id?: number;
      status?: TopicStatusFilter;
    },
  ) {
    const topics = await this.topicReadRepository.listTopicsForTeacher(teacherId, filters);

    return topics
      .map((topic) => ({
        ...topic,
        status: normalizeTopicStatus(topic),
      }))
      .filter((topic) => !filters.status || topic.status === filters.status);
  }

  async getTopicStandingMatrix(teacherId: number, topicId: number) {
    const topic = await this.topicReadRepository.findOwnedTopic(teacherId, topicId);
    if (!topic) {
      throw new ServiceError('topic not found', 404);
    }

    const problems = await this.topicReadRepository.listTopicProblems(teacherId, topicId);
    const activeEnrollments = await this.topicReadRepository.listActiveEnrollmentsForClass(
      teacherId,
      topic.class_id,
    );
    const studentIds = Array.from(new Set(activeEnrollments.map((item) => item.student_id)));
    const students = await this.topicReadRepository.findStudentsByIds(teacherId, studentIds);
    const standings = await this.topicReadRepository.listTopicStandings(teacherId, topicId);

    const standingMap = new Map<string, (typeof standings)[number]>();
    standings.forEach((standing) => {
      standingMap.set(`${standing.student_id}:${standing.problem_id}`, standing);
    });

    const rows = students
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
      .map((student) => {
        const problemRows = problems.map((problem) => {
          const standing = standingMap.get(`${student.id}:${problem.id}`);
          return {
            problem_id: problem.id,
            problem_index: problem.problem_index,
            problem_name: problem.problem_name,
            solved: standing?.solved ?? false,
            penalty_minutes: standing?.penalty_minutes ?? null,
            pulled_at: standing?.pulled_at ?? null,
          };
        });

        return {
          student_id: student.id,
          student_name: student.full_name,
          solved_count: problemRows.filter((item) => item.solved).length,
          problems: problemRows,
        };
      });

    return {
      topic,
      problems,
      rows,
    };
  }
}
