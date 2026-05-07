import { ClassStatus } from '../../../../../entities/enums.js';
import { ClassroomClass } from '../../../domain/models/Class.js';
import { ClassOrmEntity } from './ClassOrmEntity.js';

export class ClassMapper {
  static toDomain(entity: ClassOrmEntity): ClassroomClass {
    return ClassroomClass.restore({
      id: entity.id,
      teacherId: entity.teacher_id,
      name: entity.name,
      feePerSession: entity.fee_per_session,
      status: entity.status,
      createdAt: entity.created_at,
      archivedAt: entity.archived_at,
    });
  }

  static toOrmEntity(entity: ClassOrmEntity, classroomClass: ClassroomClass): ClassOrmEntity {
    const snapshot = classroomClass.toSnapshot();

    entity.teacher_id = snapshot.teacherId;
    entity.name = snapshot.name;
    entity.fee_per_session = snapshot.feePerSession;
    entity.status = snapshot.status ?? ClassStatus.Active;
    entity.archived_at = snapshot.archivedAt;

    return entity;
  }
}
