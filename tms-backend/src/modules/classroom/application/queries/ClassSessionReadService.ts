import type {
  SessionListFilters,
  SessionSummary,
} from '../dto/ClassDto.js';
import type { SessionReadRepository } from './SessionReadRepository.js';

export class ClassSessionReadService {
  constructor(private readonly sessions: SessionReadRepository) {}

  listSessions(teacherId: number, filters: SessionListFilters): Promise<SessionSummary[]> {
    return this.sessions.listSessions(teacherId, filters);
  }

  listClassSessions(
    teacherId: number,
    classId: number,
    filters: Omit<SessionListFilters, 'class_id'>,
  ): Promise<SessionSummary[]> {
    return this.sessions.listSessions(teacherId, {
      ...filters,
      class_id: classId,
    });
  }
}
