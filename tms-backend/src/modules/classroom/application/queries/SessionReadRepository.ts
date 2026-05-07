import type {
  SessionListFilters,
  SessionSummary,
} from '../dto/ClassDto.js';

export interface SessionReadRepository {
  listSessions(teacherId: number, filters: SessionListFilters): Promise<SessionSummary[]>;
}
