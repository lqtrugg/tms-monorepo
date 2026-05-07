import { ClassStatus } from '../../../../entities/enums.js';
import { ClassServiceError } from '../../../../shared/errors/class.error.js';
import type { ClassScheduleSessionGenerationPort } from '../ports/ClassScheduleSessionGenerationPort.js';
import type { ClassScheduleRepository } from '../../infrastructure/persistence/typeorm/ClassScheduleRepository.js';

type DeleteClassScheduleCommand = {
  teacherId: number;
  classId: number;
  scheduleId: number;
};

export class DeleteClassScheduleUseCase {
  constructor(
    private readonly schedules: ClassScheduleRepository,
    private readonly sessionGeneration: ClassScheduleSessionGenerationPort,
  ) {}

  async execute(command: DeleteClassScheduleCommand): Promise<void> {
    const classEntity = await this.schedules.findClassById(command.teacherId, command.classId);

    if (!classEntity) {
      throw new ClassServiceError('class not found', 404);
    }

    if (classEntity.status !== ClassStatus.Active) {
      throw new ClassServiceError('class is archived', 409);
    }

    const schedule = await this.schedules.findByIdForClass(
      command.teacherId,
      command.classId,
      command.scheduleId,
    );

    if (!schedule) {
      throw new ClassServiceError('class schedule not found', 404);
    }

    await this.schedules.remove(schedule);
    await this.sessionGeneration.reconcileGeneratedSessionsForClass(
      command.teacherId,
      command.classId,
    );
  }
}
