import { ClassServiceError } from '../../../../shared/errors/class.error.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';

type RequestUser = {
  id?: number;
};

export function getTeacherId(request: HttpRequest<unknown, {
  classId?: number;
  sessionId?: number;
  studentId?: number;
}>): number {
  const teacherId = (request.user as RequestUser | undefined)?.id;

  if (!Number.isInteger(teacherId) || (teacherId as number) <= 0) {
    throw new ClassServiceError('unauthorized', 401);
  }

  return teacherId as number;
}

export function getClassId(request: HttpRequest<unknown, { classId?: number }>): number {
  const classId = request.params?.classId;

  if (!Number.isInteger(classId) || (classId as number) <= 0) {
    throw new ClassServiceError('classId param is required', 400);
  }

  return classId as number;
}

export function getSessionId(request: HttpRequest<unknown, { sessionId?: number }>): number {
  const sessionId = request.params?.sessionId;

  if (!Number.isInteger(sessionId) || (sessionId as number) <= 0) {
    throw new ClassServiceError('sessionId param is required', 400);
  }

  return sessionId as number;
}

export function getStudentId(request: HttpRequest<unknown, { studentId?: number }>): number {
  const studentId = request.params?.studentId;

  if (!Number.isInteger(studentId) || (studentId as number) <= 0) {
    throw new ClassServiceError('studentId param is required', 400);
  }

  return studentId as number;
}
