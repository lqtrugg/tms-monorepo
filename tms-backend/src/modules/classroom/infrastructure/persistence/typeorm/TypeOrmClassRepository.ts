import type { EntityManager } from 'typeorm';

import type { ClassroomClass } from '../../../domain/models/Class.js';
import type { ClassRepository } from './ClassRepository.js';
import { ClassMapper } from './ClassMapper.js';
import { ClassOrmEntity } from './ClassOrmEntity.js';

export class TypeOrmClassRepository implements ClassRepository {
  constructor(private readonly manager: EntityManager) {}

  async findById(classId: number): Promise<ClassroomClass | null> {
    const entity = await this.manager.getRepository(ClassOrmEntity).findOneBy({ id: classId });
    return entity ? ClassMapper.toDomain(entity) : null;
  }

  async save(classroomClass: ClassroomClass): Promise<ClassroomClass> {
    const snapshot = classroomClass.toSnapshot();
    const repository = this.manager.getRepository(ClassOrmEntity);
    const entity = snapshot.id === null
      ? repository.create()
      : await repository.findOneByOrFail({ id: snapshot.id });

    ClassMapper.toOrmEntity(entity, classroomClass);

    const saved = await repository.save(entity);
    return ClassMapper.toDomain(saved);
  }
}
