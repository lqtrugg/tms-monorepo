import { EntityManager, In, IsNull } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Enrollment,
  Student,
  Teacher,
  Topic,
  TopicProblem,
  TopicStanding,
} from '../../entities/index.js';

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

export class TopicRepository {
  constructor(private readonly manager: EntityManager = AppDataSource.manager) {}

  teachers() {
    return teacherRepository(this.manager);
  }

  topics() {
    return topicRepository(this.manager);
  }

  topicProblems() {
    return topicProblemRepository(this.manager);
  }

  topicStandings() {
    return topicStandingRepository(this.manager);
  }

  enrollments() {
    return enrollmentRepository(this.manager);
  }

  students() {
    return studentRepository(this.manager);
  }

  findOwnedTopic(teacherId: number, topicId: number): Promise<Topic | null> {
    return findOwnedTopic(this.manager, teacherId, topicId);
  }

  findTeacherById(teacherId: number): Promise<Teacher | null> {
    return findTeacherById(this.manager, teacherId);
  }

  listTopicsForTeacher(teacherId: number, filters: Parameters<typeof listTopicsForTeacher>[1]): Promise<Topic[]> {
    return listTopicsForTeacher(teacherId, filters);
  }

  findTopicByGym(teacherId: number, classId: number, gymId: string): Promise<Topic | null> {
    return findTopicByGym(this.manager, teacherId, classId, gymId);
  }

  createTopicEntity(values: Partial<Topic>): Topic {
    return createTopicEntity(this.manager, values);
  }

  saveTopic(topic: Topic): Promise<Topic> {
    return saveTopic(this.manager, topic);
  }

  findTopicProblemByIndex(topicId: number, problemIndex: string): Promise<TopicProblem | null> {
    return findTopicProblemByIndex(this.manager, topicId, problemIndex);
  }

  findOwnedTopicProblem(teacherId: number, topicId: number, problemId: number): Promise<TopicProblem | null> {
    return findOwnedTopicProblem(this.manager, teacherId, topicId, problemId);
  }

  createTopicProblemEntity(values: Partial<TopicProblem>): TopicProblem {
    return createTopicProblemEntity(this.manager, values);
  }

  saveTopicProblem(topicProblem: TopicProblem): Promise<TopicProblem> {
    return saveTopicProblem(this.manager, topicProblem);
  }

  findTopicStanding(
    teacherId: number,
    topicId: number,
    studentId: number,
    problemId: number,
  ): Promise<TopicStanding | null> {
    return findTopicStanding(this.manager, teacherId, topicId, studentId, problemId);
  }

  createTopicStandingEntity(values: Partial<TopicStanding>): TopicStanding {
    return createTopicStandingEntity(this.manager, values);
  }

  saveTopicStanding(topicStanding: TopicStanding): Promise<TopicStanding> {
    return saveTopicStanding(this.manager, topicStanding);
  }

  findOwnedStudent(teacherId: number, studentId: number): Promise<Student | null> {
    return findOwnedStudent(this.manager, teacherId, studentId);
  }

  listTopicProblems(teacherId: number, topicId: number): Promise<TopicProblem[]> {
    return listTopicProblems(teacherId, topicId);
  }

  listActiveEnrollmentsForClass(teacherId: number, classId: number): Promise<Enrollment[]> {
    return listActiveEnrollmentsForClass(teacherId, classId);
  }

  findStudentsByIds(teacherId: number, studentIds: number[]): Promise<Student[]> {
    return findStudentsByIds(teacherId, studentIds);
  }

  listTopicStandings(teacherId: number, topicId: number): Promise<TopicStanding[]> {
    return listTopicStandings(teacherId, topicId);
  }
}
