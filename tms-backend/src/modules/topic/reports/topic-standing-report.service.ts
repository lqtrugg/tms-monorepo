import { AppDataSource } from '../../../data-source.js';
import { Topic, TopicStanding } from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import {
  findStudentsByIds,
  listActiveEnrollmentsForClass,
  listTopicProblems,
  listTopicStandings,
} from '../topic.repository.js';

async function requireTopicById(topicId: number): Promise<Topic> {
  const topic = await AppDataSource.getRepository(Topic).findOneBy({ id: topicId });
  if (!topic) {
    throw new ServiceError('topic not found', 404);
  }

  return topic;
}

export async function getTopicStandingMatrix(teacherId: number, topicId: number) {
  const topic = await requireTopicById(topicId);
  const problems = await listTopicProblems(teacherId, topicId);
  const activeEnrollments = await listActiveEnrollmentsForClass(teacherId, topic.class_id);
  const studentIds = Array.from(new Set(activeEnrollments.map((item) => item.student_id)));
  const students = await findStudentsByIds(teacherId, studentIds);
  const standings = await listTopicStandings(teacherId, topicId);

  const standingMap = new Map<string, TopicStanding>();
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
