import { AppDataSource } from '../../data-source.js';
import { Teacher } from '../../entities/index.js';

export function createTeacher(input: Partial<Teacher>): Teacher {
  return AppDataSource.getRepository(Teacher).create(input);
}

export function saveTeacher(teacher: Teacher): Promise<Teacher> {
  return AppDataSource.getRepository(Teacher).save(teacher);
}

export function findTeacherById(teacherId: number): Promise<Teacher | null> {
  return AppDataSource.getRepository(Teacher).findOneBy({ id: teacherId });
}

export function findTeacherByUsername(username: string): Promise<Teacher | null> {
  return AppDataSource.getRepository(Teacher).findOneBy({ username });
}

export function listTeachersNewestFirst(): Promise<Teacher[]> {
  return AppDataSource.getRepository(Teacher).find({
    order: {
      created_at: 'DESC',
    },
  });
}
