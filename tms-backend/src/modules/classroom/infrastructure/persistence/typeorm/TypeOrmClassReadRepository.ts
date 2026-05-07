import type { EntityManager, FindOptionsWhere } from 'typeorm';

import type { ClassStatus } from '../../../../../entities/enums.js';
import type { ClassListFilters, ClassSummary } from '../../../application/dto/ClassDto.js';
import type { ClassReadRepository } from '../../../application/queries/ClassReadRepository.js';
import { ClassOrmEntity } from './ClassOrmEntity.js';

export class TypeOrmClassReadRepository implements ClassReadRepository {
  constructor(private readonly manager: EntityManager) {}

  async listClasses(teacherId: number, filters: ClassListFilters): Promise<ClassSummary[]> {
    const where: FindOptionsWhere<ClassOrmEntity> = {
      teacher_id: teacherId,
      ...(filters.status ? { status: filters.status as ClassStatus } : {}),
    };

    const classes = await this.manager.getRepository(ClassOrmEntity).find({
      where,
      order: {
        created_at: 'DESC',
      },
    });

    return classes.map((classEntity) => this.toSummary(classEntity));
  }

  async getClassById(teacherId: number, classId: number): Promise<ClassSummary | null> {
    const classEntity = await this.manager.getRepository(ClassOrmEntity).findOneBy({
      id: classId,
      teacher_id: teacherId,
    });

    return classEntity ? this.toSummary(classEntity) : null;
  }

  private toSummary(classEntity: ClassOrmEntity): ClassSummary {
    return {
      id: classEntity.id,
      teacher_id: classEntity.teacher_id,
      name: classEntity.name,
      fee_per_session: classEntity.fee_per_session,
      status: classEntity.status,
      created_at: classEntity.created_at,
      archived_at: classEntity.archived_at,
    };
  }
}
