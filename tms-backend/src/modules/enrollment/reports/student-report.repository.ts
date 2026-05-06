import { In } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import {
  Class,
  ClassStatus,
  Student,
  StudentStatus,
  Topic,
  TopicProblem,
  TopicStanding,
} from '../../../entities/index.js';

export function countActiveStudents(teacherId: number): Promise<number> {
  return AppDataSource.getRepository(Student).countBy({
    teacher_id: teacherId,
    status: StudentStatus.Active,
  });
}

export function countActiveClasses(teacherId: number): Promise<number> {
  return AppDataSource.getRepository(Class).countBy({
    teacher_id: teacherId,
    status: ClassStatus.Active,
  });
}

export function findOwnedStudent(teacherId: number, studentId: number): Promise<Student | null> {
  return AppDataSource.getRepository(Student).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
}

export function findClassesByIds(teacherId: number, classIds: number[]): Promise<Class[]> {
  return classIds.length > 0
    ? AppDataSource.getRepository(Class).findBy({ teacher_id: teacherId, id: In(classIds) })
    : Promise.resolve([]);
}

export function findTopicsByIds(teacherId: number, topicIds: number[]): Promise<Topic[]> {
  return topicIds.length > 0
    ? AppDataSource.getRepository(Topic).findBy({ teacher_id: teacherId, id: In(topicIds) })
    : Promise.resolve([]);
}

export function findTopicProblemsByIds(teacherId: number, problemIds: number[]): Promise<TopicProblem[]> {
  return problemIds.length > 0
    ? AppDataSource.getRepository(TopicProblem).findBy({ teacher_id: teacherId, id: In(problemIds) })
    : Promise.resolve([]);
}

export function findStudentTopicStandings(teacherId: number, studentId: number): Promise<TopicStanding[]> {
  return AppDataSource.getRepository(TopicStanding).find({
    where: {
      teacher_id: teacherId,
      student_id: studentId,
    },
    order: {
      pulled_at: 'DESC',
    },
  });
}
