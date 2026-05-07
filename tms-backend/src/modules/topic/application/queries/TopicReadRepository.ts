import type { Topic } from '../../../../entities/topic.entity.js';
import type { TopicProblem } from '../../../../entities/topic-problem.entity.js';
import type { TopicStanding } from '../../../../entities/topic-standing.entity.js';
import type { Student } from '../../../../entities/student.entity.js';
import type { Enrollment } from '../../../../entities/enrollment.entity.js';

export interface TopicReadRepository {
  listTopicsForTeacher(teacherId: number, filters: { class_id?: number }): Promise<Topic[]>;
  findOwnedTopic(teacherId: number, topicId: number): Promise<Topic | null>;
  listTopicProblems(teacherId: number, topicId: number): Promise<TopicProblem[]>;
  listActiveEnrollmentsForClass(teacherId: number, classId: number): Promise<Enrollment[]>;
  findStudentsByIds(teacherId: number, studentIds: number[]): Promise<Student[]>;
  listTopicStandings(teacherId: number, topicId: number): Promise<TopicStanding[]>;
}
