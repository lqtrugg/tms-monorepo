import type { ClassListFilters, ClassSummary } from '../dto/ClassDto.js';

export interface ClassReadRepository {
  listClasses(teacherId: number, filters: ClassListFilters): Promise<ClassSummary[]>;
  getClassById(teacherId: number, classId: number): Promise<ClassSummary | null>;
}
