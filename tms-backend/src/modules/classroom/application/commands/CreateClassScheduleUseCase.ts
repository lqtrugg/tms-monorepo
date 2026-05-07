import { ClassStatus } from '../../../../entities/enums.js';
import { ClassServiceError } from '../../../../shared/errors/class.error.js';
import type {
  ClassScheduleInput,
  ClassScheduleSummary,
} from '../dto/ClassDto.js';
import type { ClassScheduleSessionGenerationPort } from '../ports/ClassScheduleSessionGenerationPort.js';
import type { ClassScheduleRepository } from '../../infrastructure/persistence/typeorm/ClassScheduleRepository.js';
import { ClassScheduleMapper } from '../../infrastructure/persistence/typeorm/ClassScheduleMapper.js';

type CreateClassScheduleCommand = {
  teacherId: number;
  classId: number;
  schedule: ClassScheduleInput;
};

export class CreateClassScheduleUseCase {
  constructor(
    private readonly schedules: ClassScheduleRepository,
    private readonly sessionGeneration: ClassScheduleSessionGenerationPort,
  ) {}

  async execute(command: CreateClassScheduleCommand): Promise<{ schedule: ClassScheduleSummary; sessions_created: number }> {
    const classEntity = await this.schedules.findClassById(command.teacherId, command.classId);

    if (!classEntity) {
      throw new ClassServiceError('class not found', 404);
    }

    if (classEntity.status !== ClassStatus.Active) {
      throw new ClassServiceError('class is archived', 409);
    }

    this.assertScheduleTimeRange(command.schedule);

    const hasScheduleOverlap = await this.schedules.hasOverlappingPersistedSchedule(
      command.teacherId,
      command.schedule,
    );

    if (hasScheduleOverlap) {
      throw new ClassServiceError('Lịch học không được giao nhau', 409);
    }

    const hasSessionOverlap = await this.schedules.hasOverlappingUpcomingSessions(
      command.teacherId,
      command.classId,
      [command.schedule],
    );

    if (hasSessionOverlap) {
      throw new ClassServiceError('Lịch học bị trùng với buổi học đã có', 409);
    }

    const schedule = this.schedules.create({
      teacher_id: command.teacherId,
      class_id: command.classId,
      day_of_week: command.schedule.day_of_week,
      start_time: command.schedule.start_time,
      end_time: command.schedule.end_time,
    });

    const saved = await this.schedules.save(schedule);
    const result = await this.sessionGeneration.reconcileGeneratedSessionsForClass(
      command.teacherId,
      command.classId,
    );

    return {
      schedule: ClassScheduleMapper.toSummary(saved),
      sessions_created: result.sessions_created,
    };
  }

  private assertScheduleTimeRange(schedule: ClassScheduleInput): void {
    if (schedule.end_time <= schedule.start_time) {
      throw new ClassServiceError('end_time must be later than start_time', 400);
    }
  }
}
