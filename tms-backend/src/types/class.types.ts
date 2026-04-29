import type { ClassStatus, SessionStatus } from '../entities/index.js';

export type ClassListFilters = {
  status?: ClassStatus;
};

export type CreateClassInput = {
  name: string;
  fee_per_session: string;
};

export type UpdateClassInput = {
  name?: string;
  fee_per_session?: string;
};

export type CreateClassScheduleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type UpdateClassScheduleInput = {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
};

export type SessionListFilters = {
  class_id?: number;
  status?: SessionStatus;
  from?: Date;
  to?: Date;
};

export type CreateManualSessionInput = {
  scheduled_at: Date;
  end_time: string;
};

export type UpsertCodeforcesGroupInput = {
  group_url: string;
  group_name: string | null;
};
