import { toAdminTeacher } from '../mappers/AdminMapper.js';
import type { TeacherRepository } from '../../infrastructure/persistence/typeorm/TeacherRepository.js';

export class AdminTeacherReadService {
  constructor(private readonly teacherRepository: TeacherRepository) {}

  async listTeachers() {
    const teachers = await this.teacherRepository.listNewestFirst();
    return teachers.map(toAdminTeacher);
  }
}
