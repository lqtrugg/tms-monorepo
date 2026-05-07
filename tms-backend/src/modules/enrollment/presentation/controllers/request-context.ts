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

export function getStudentId(request: HttpRequest): number {
  const studentId = (request.params as { studentId?: number } | undefined)?.studentId;

  if (studentId === undefined) {
    throw new ServiceError('studentId is required', 400);
  }

  return studentId;
}
