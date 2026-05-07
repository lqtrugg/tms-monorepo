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

export function getIdParam(request: HttpRequest<unknown, { id?: number }>): number {
  const id = request.params?.id;

  if (typeof id !== 'number') {
    throw new ServiceError('invalid id', 400);
  }

  return id;
}
