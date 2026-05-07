import type { Teacher } from '../../../../entities/teacher.entity.js';
import { toAuthTeacher } from '../mappers/AuthMapper.js';

export class AuthReadService {
  me(teacher: Teacher) {
    return toAuthTeacher(teacher);
  }
}
