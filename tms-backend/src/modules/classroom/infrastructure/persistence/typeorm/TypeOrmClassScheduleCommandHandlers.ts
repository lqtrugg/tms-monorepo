import { AppDataSource } from '../../../../../data-source.js';
import { CreateClassScheduleUseCase } from '../../../application/commands/CreateClassScheduleUseCase.js';
import { DeleteClassScheduleUseCase } from '../../../application/commands/DeleteClassScheduleUseCase.js';
import { UpdateClassScheduleUseCase } from '../../../application/commands/UpdateClassScheduleUseCase.js';
import type {
  ClassScheduleInput,
} from '../../../application/dto/ClassDto.js';
import { TypeOrmClassScheduleRepository } from './TypeOrmClassScheduleRepository.js';
import { TypeOrmClassScheduleSessionGenerationPort } from './TypeOrmClassScheduleSessionGenerationPort.js';

export class TypeOrmClassScheduleCommandHandlers {
  async createClassSchedule(input: {
    teacherId: number;
    classId: number;
    schedule: ClassScheduleInput;
  }) {
    return AppDataSource.transaction(async (manager) => {
      const schedules = new TypeOrmClassScheduleRepository(manager);
      const sessionGeneration = new TypeOrmClassScheduleSessionGenerationPort(manager);
      const useCase = new CreateClassScheduleUseCase(schedules, sessionGeneration);
      return useCase.execute(input);
    });
  }

  async updateClassSchedule(input: {
    teacherId: number;
    classId: number;
    scheduleId: number;
    schedule: Partial<ClassScheduleInput>;
  }) {
    return AppDataSource.transaction(async (manager) => {
      const schedules = new TypeOrmClassScheduleRepository(manager);
      const sessionGeneration = new TypeOrmClassScheduleSessionGenerationPort(manager);
      const useCase = new UpdateClassScheduleUseCase(schedules, sessionGeneration);
      return useCase.execute(input);
    });
  }

  async deleteClassSchedule(input: {
    teacherId: number;
    classId: number;
    scheduleId: number;
  }) {
    return AppDataSource.transaction(async (manager) => {
      const schedules = new TypeOrmClassScheduleRepository(manager);
      const sessionGeneration = new TypeOrmClassScheduleSessionGenerationPort(manager);
      const useCase = new DeleteClassScheduleUseCase(schedules, sessionGeneration);
      return useCase.execute(input);
    });
  }
}
