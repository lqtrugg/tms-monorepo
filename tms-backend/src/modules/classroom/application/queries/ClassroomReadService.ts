import { ClassServiceError } from '../../../../shared/errors/class.error.js';
import type { ClassListFilters, ClassSummary } from '../dto/ClassDto.js';
import type { ClassReadRepository } from './ClassReadRepository.js';

export class ClassroomReadService {
  constructor(private readonly classes: ClassReadRepository) {}

  listClasses(teacherId: number, filters: ClassListFilters): Promise<ClassSummary[]> {
    return this.classes.listClasses(teacherId, filters);
  }

  async getClassById(teacherId: number, classId: number): Promise<ClassSummary> {
    const classEntity = await this.classes.getClassById(teacherId, classId);

    if (!classEntity) {
      throw new ClassServiceError('class not found', 404);
    }

    return classEntity;
  }
}
