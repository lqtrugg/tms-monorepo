import type { ClassScheduleSummary } from '../../../application/dto/ClassDto.js';
import type { ClassScheduleOrmEntity } from './ClassScheduleOrmEntity.js';

export class ClassScheduleMapper {
  static toSummary(schedule: ClassScheduleOrmEntity): ClassScheduleSummary {
    return {
      id: schedule.id,
      teacher_id: schedule.teacher_id,
      class_id: schedule.class_id,
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
    };
  }
}
