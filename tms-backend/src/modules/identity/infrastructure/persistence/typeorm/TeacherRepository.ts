import type { TeacherOrmEntity } from './TeacherOrmEntity.js';

export interface TeacherRepository {
  create(input: Partial<TeacherOrmEntity>): TeacherOrmEntity;
  save(teacher: TeacherOrmEntity): Promise<TeacherOrmEntity>;
  findById(teacherId: number): Promise<TeacherOrmEntity | null>;
  findByUsername(username: string): Promise<TeacherOrmEntity | null>;
  listNewestFirst(): Promise<TeacherOrmEntity[]>;
}
