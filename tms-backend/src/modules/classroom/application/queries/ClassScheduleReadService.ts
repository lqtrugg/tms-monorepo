import type { ClassScheduleSummary } from '../dto/ClassDto.js';
import type { ClassScheduleReadRepository } from './ClassScheduleReadRepository.js';

export class ClassScheduleReadService {
  constructor(private readonly schedules: ClassScheduleReadRepository) {}

  listClassSchedules(teacherId: number, classId: number): Promise<ClassScheduleSummary[]> {
    return this.schedules.listClassSchedules(teacherId, classId);
  }
}
