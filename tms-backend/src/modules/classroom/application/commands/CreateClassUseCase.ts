import type { ClassSchedulePort } from '../ports/ClassSchedulePort.js';
import type { ClassSummary, CreateClassInput } from '../dto/ClassDto.js';
import { ClassroomClass } from '../../domain/models/Class.js';
import type { ClassRepository } from '../../infrastructure/persistence/typeorm/ClassRepository.js';

type CreateClassCommand = {
  teacherId: number;
  name: string;
  feePerSession: string;
  schedules?: CreateClassInput['schedules'];
};

export class CreateClassUseCase {
  constructor(
    private readonly classes: ClassRepository,
    private readonly classSchedules: ClassSchedulePort,
  ) {}

  async execute(command: CreateClassCommand): Promise<ClassSummary> {
    const classroomClass = ClassroomClass.create({
      teacherId: command.teacherId,
      name: command.name,
      feePerSession: command.feePerSession,
    });

    const savedClass = await this.classes.save(classroomClass);
    const schedules = command.schedules ?? [];
    const savedClassSnapshot = savedClass.toSnapshot();

    if (schedules.length > 0) {
      if (savedClassSnapshot.id === null) {
        throw new Error('saved class is missing id');
      }

      await this.classSchedules.replaceSchedules(command.teacherId, savedClassSnapshot.id, schedules);
    }

    return this.toSummary(savedClass);
  }

  private toSummary(classroomClass: ClassroomClass): ClassSummary {
    const snapshot = classroomClass.toSnapshot();

    if (snapshot.id === null || snapshot.createdAt === null) {
      throw new Error('saved class is missing persistence fields');
    }

    return {
      id: snapshot.id,
      teacher_id: snapshot.teacherId,
      name: snapshot.name,
      fee_per_session: snapshot.feePerSession,
      status: snapshot.status,
      created_at: snapshot.createdAt,
      archived_at: snapshot.archivedAt,
    };
  }
}
