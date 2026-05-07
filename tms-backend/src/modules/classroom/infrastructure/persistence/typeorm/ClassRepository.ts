import type { ClassroomClass } from '../../../domain/models/Class.js';

export interface ClassRepository {
  findById(classId: number): Promise<ClassroomClass | null>;
  save(classroomClass: ClassroomClass): Promise<ClassroomClass>;
}
