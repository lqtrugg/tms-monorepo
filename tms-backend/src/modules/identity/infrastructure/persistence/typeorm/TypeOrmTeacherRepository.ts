import { AppDataSource } from '../../../../../data-source.js';
import type { TeacherRepository } from './TeacherRepository.js';
import { TeacherOrmEntity } from './TeacherOrmEntity.js';

export class TypeOrmTeacherRepository implements TeacherRepository {
  create(input: Partial<TeacherOrmEntity>): TeacherOrmEntity {
    return AppDataSource.getRepository(TeacherOrmEntity).create(input);
  }

  save(teacher: TeacherOrmEntity): Promise<TeacherOrmEntity> {
    return AppDataSource.getRepository(TeacherOrmEntity).save(teacher);
  }

  findById(teacherId: number): Promise<TeacherOrmEntity | null> {
    return AppDataSource.getRepository(TeacherOrmEntity).findOneBy({ id: teacherId });
  }

  findByUsername(username: string): Promise<TeacherOrmEntity | null> {
    return AppDataSource.getRepository(TeacherOrmEntity).findOneBy({ username });
  }

  listNewestFirst(): Promise<TeacherOrmEntity[]> {
    return AppDataSource.getRepository(TeacherOrmEntity).find({
      order: {
        created_at: 'DESC',
      },
    });
  }
}
