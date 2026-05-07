import type { ClassScheduleInput } from '../dto/ClassDto.js';

export interface ClassSchedulePort {
  replaceSchedules(teacherId: number, classId: number, schedules: ClassScheduleInput[]): Promise<void>;
}
