import type { EntityManager } from 'typeorm';

import { Class } from '../../../../../entities/class.entity.js';
import { ClassStatus } from '../../../../../entities/enums.js';
import { StudentServiceError } from '../../../../../shared/errors/student.error.js';
import type { ClassroomPort } from '../../../application/ports/ClassroomPort.js';

export class TypeOrmClassroomPort implements ClassroomPort {
  constructor(private readonly manager: EntityManager) {}

  async ensureActiveClass(classId: number): Promise<void> {
    const classEntity = await this.manager.getRepository(Class).findOneBy({ id: classId });

    if (!classEntity) {
      throw new StudentServiceError('class not found', 404);
    }

    if (classEntity.status !== ClassStatus.Active) {
      throw new StudentServiceError('class is archived', 409);
    }
  }
}
