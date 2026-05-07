import type { Teacher } from '../../../../entities/teacher.entity.js';
import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';

export function getTeacher(request: HttpRequest): Teacher {
  const teacher = request.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher;
}
