import { ClassStatus, type BindClassGymInput } from '../../contracts/types.js';
import { HttpError } from '../../../../shared/errors/HttpError.js';
import type { TypeOrmGymWriter } from '../../infrastructure/persistence/typeorm/Writer.js';

export class AssignGym {
  constructor(private readonly gymWriter: TypeOrmGymWriter) {}

  async execute(teacherId: number, classId: number, input: BindClassGymInput) {
    const classEntity = await this.gymWriter.findClassById(classId);
    if (!classEntity) {
      throw new HttpError('class not found', 404);
    }

    if (classEntity.status !== ClassStatus.Active) {
      throw new HttpError('class is archived', 409);
    }

    const gym = await this.gymWriter.findTeacherGymByCodeforcesGymId(teacherId, input.gym_id);
    if (!gym) {
      throw new HttpError('codeforces gym not synced yet', 404);
    }

    if (gym.class_id === classId) {
      return gym;
    }

    if (gym.class_id !== null) {
      throw new HttpError('gym is already bound to another class', 409);
    }

    gym.class_id = classId;
    return this.gymWriter.saveGym(gym);
  }
}
