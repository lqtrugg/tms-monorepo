import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';

function parsePositiveInteger(value: unknown, label: string): number {
  const normalized = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new ServiceError(`${label} is required`, 400);
  }

  return normalized;
}

export function getTeacherId(request: HttpRequest): number {
  const teacher = request.user as { id?: number } | undefined;

  if (!teacher?.id) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

export function getTopicId(request: HttpRequest): number {
  return parsePositiveInteger((request.params as { topicId?: unknown } | undefined)?.topicId, 'topicId');
}
