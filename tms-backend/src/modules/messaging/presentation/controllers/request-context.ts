import type { Teacher } from '../../../../entities/teacher.entity.js';
import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';

export function getTeacherId(request: HttpRequest): number {
  const teacher = request.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

export function getClassId(request: HttpRequest<unknown, { classId?: number }>): number {
  const classId = request.params?.classId;

  if (typeof classId !== 'number') {
    throw new ServiceError('classId is required', 400);
  }

  return classId;
}
