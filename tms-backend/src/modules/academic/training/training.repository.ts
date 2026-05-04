import { EntityManager, In, IsNull } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import {
  Class,
  Enrollment,
  Student,
  Teacher,
  Topic,
  TopicProblem,
  TopicStanding,
} from '../../../entities/index.js';

export function classRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Class);
}

export function teacherRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Teacher);
}

export function topicRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Topic);
}

export function topicProblemRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(TopicProblem);
}

export function topicStandingRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(TopicStanding);
}

export function enrollmentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Enrollment);
}

export function studentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Student);
}

export function findOwnedClass(
  manager: EntityManager,
  teacherId: number,
  classId: number,
): Promise<Class | null> {
  return classRepository(manager).findOneBy({
    id: classId,
    teacher_id: teacherId,
  });
}

export function findOwnedTopic(
  manager: EntityManager,
  teacherId: number,
  topicId: number,
): Promise<Topic | null> {
  return topicRepository(manager).findOneBy({
    id: topicId,
    teacher_id: teacherId,
  });
}

export function findTeacherById(
  manager: EntityManager,
  teacherId: number,
): Promise<Teacher | null> {
  return teacherRepository(manager).findOneBy({
    id: teacherId,
  });
}

export function listTopicsForTeacher(teacherId: number, filters: {
  class_id?: number;
}): Promise<Topic[]> {
  return topicRepository().find({
    where: {
      teacher_id: teacherId,
      ...(filters.class_id !== undefined ? { class_id: filters.class_id } : {}),
    },
    order: {
      created_at: 'DESC',
    },
  });
}

export function findTopicByGym(
  manager: EntityManager,
  teacherId: number,
  classId: number,
  gymId: string,
): Promise<Topic | null> {
  return topicRepository(manager).findOneBy({
    teacher_id: teacherId,
    class_id: classId,
    gym_id: gymId,
  });
}

export function createTopicEntity(
  manager: EntityManager,
  values: Partial<Topic>,
): Topic {
  return topicRepository(manager).create(values);
}

export function saveTopic(
  manager: EntityManager,
  topic: Topic,
): Promise<Topic> {
  return topicRepository(manager).save(topic);
}

export function findTopicProblemByIndex(
  manager: EntityManager,
  topicId: number,
  problemIndex: string,
): Promise<TopicProblem | null> {
  return topicProblemRepository(manager).findOneBy({
    topic_id: topicId,
    problem_index: problemIndex,
  });
}

export function findOwnedTopicProblem(
  manager: EntityManager,
  teacherId: number,
  topicId: number,
  problemId: number,
): Promise<TopicProblem | null> {
  return topicProblemRepository(manager).findOneBy({
    id: problemId,
    teacher_id: teacherId,
    topic_id: topicId,
  });
}

export function createTopicProblemEntity(
  manager: EntityManager,
  values: Partial<TopicProblem>,
): TopicProblem {
  return topicProblemRepository(manager).create(values);
}

export function saveTopicProblem(
  manager: EntityManager,
  topicProblem: TopicProblem,
): Promise<TopicProblem> {
  return topicProblemRepository(manager).save(topicProblem);
}

export function findTopicStanding(
  manager: EntityManager,
  teacherId: number,
  topicId: number,
  studentId: number,
  problemId: number,
): Promise<TopicStanding | null> {
  return topicStandingRepository(manager).findOneBy({
    teacher_id: teacherId,
    topic_id: topicId,
    student_id: studentId,
    problem_id: problemId,
  });
}

export function createTopicStandingEntity(
  manager: EntityManager,
  values: Partial<TopicStanding>,
): TopicStanding {
  return topicStandingRepository(manager).create(values);
}

export function saveTopicStanding(
  manager: EntityManager,
  topicStanding: TopicStanding,
): Promise<TopicStanding> {
  return topicStandingRepository(manager).save(topicStanding);
}

export function findOwnedStudent(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
): Promise<Student | null> {
  return studentRepository(manager).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
}

export function listTopicProblems(teacherId: number, topicId: number): Promise<TopicProblem[]> {
  return topicProblemRepository().find({
    where: {
      teacher_id: teacherId,
      topic_id: topicId,
    },
    order: {
      problem_index: 'ASC',
    },
  });
}

export function listActiveEnrollmentsForClass(teacherId: number, classId: number): Promise<Enrollment[]> {
  return enrollmentRepository().find({
    where: {
      teacher_id: teacherId,
      class_id: classId,
      unenrolled_at: IsNull(),
    },
  });
}

export function findStudentsByIds(teacherId: number, studentIds: number[]): Promise<Student[]> {
  if (studentIds.length === 0) {
    return Promise.resolve([]);
  }

  return studentRepository().findBy({
    teacher_id: teacherId,
    id: In(studentIds),
  });
}

export function listTopicStandings(teacherId: number, topicId: number): Promise<TopicStanding[]> {
  return topicStandingRepository().find({
    where: {
      teacher_id: teacherId,
      topic_id: topicId,
    },
  });
}
