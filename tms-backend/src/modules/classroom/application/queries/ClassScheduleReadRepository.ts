import type { ClassScheduleSummary } from '../dto/ClassDto.js';

export interface ClassScheduleReadRepository {
  listClassSchedules(teacherId: number, classId: number): Promise<ClassScheduleSummary[]>;
}
