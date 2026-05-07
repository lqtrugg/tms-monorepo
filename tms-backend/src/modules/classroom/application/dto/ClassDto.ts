import type { ClassStatus, SessionStatus } from '../../../../entities/enums.js';

export type ClassScheduleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type CreateClassInput = {
  name: string;
  fee_per_session: string;
  schedules?: ClassScheduleInput[];
};

export type UpdateClassInput = {
  name?: string;
  fee_per_session?: string;
  schedules?: ClassScheduleInput[];
};

export type ClassListFilters = {
  status?: ClassStatus;
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

export type ClassSummary = {
  id: number;
  teacher_id: number;
  name: string;
  fee_per_session: string;
  status: ClassStatus;
  created_at: Date;
  archived_at: Date | null;
};

export type ClassScheduleSummary = {
  id: number;
  teacher_id: number;
  class_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export type SessionSummary = {
  id: number;
  teacher_id: number;
  class_id: number;
  scheduled_at: Date;
  end_time: string | null;
  status: SessionStatus;
  is_manual: boolean;
  created_at: Date;
  cancelled_at: Date | null;
};
