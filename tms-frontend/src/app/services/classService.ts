import { apiRequest } from "./apiClient";
import { mockClasses, type Class } from "../data/mockData";

export type BackendClassStatus = "active" | "archived";
export type BackendSessionStatus = "scheduled" | "completed" | "cancelled";

export interface BackendClass {
  id: number;
  teacher_id: number;
  name: string;
  fee_per_session: string;
  status: BackendClassStatus;
  created_at: string;
  archived_at: string | null;
}

export interface BackendClassSchedule {
  id: number;
  teacher_id: number;
  class_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface BackendSession {
  id: number;
  teacher_id: number;
  class_id: number;
  scheduled_at: string;
  status: BackendSessionStatus;
  is_manual: boolean;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: number | null;
}

type RawBackendClass = Omit<BackendClass, "status"> & {
  status: string;
};

type RawBackendSession = Omit<BackendSession, "status"> & {
  status: string;
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

let bootstrapPromise: Promise<void> | null = null;

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    query.set(key, String(value));
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeTime(startTime: string): string {
  return startTime.slice(0, 5);
}

function formatScheduleSummary(schedules: BackendClassSchedule[]): string {
  if (schedules.length === 0) {
    return "Chưa thiết lập";
  }

  const summary = schedules
    .map(
      (schedule) => `${DAY_LABELS[schedule.day_of_week] ?? "?"} ${normalizeTime(schedule.start_time)}-${normalizeTime(schedule.end_time)}`,
    );

  return Array.from(new Set(summary)).join(", ");
}

function parseFeePerSession(feePerSession: string): number {
  const parsed = Number(feePerSession);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeClassStatus(status: string): BackendClassStatus {
  return status.toLowerCase() === "archived" ? "archived" : "active";
}

function normalizeSessionStatus(status: string): BackendSessionStatus {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return "completed";
  }

  if (normalized === "cancelled") {
    return "cancelled";
  }

  return "scheduled";
}

function normalizeBackendClass(classItem: RawBackendClass): BackendClass {
  return {
    ...classItem,
    status: normalizeClassStatus(classItem.status),
  };
}

function normalizeBackendSession(session: RawBackendSession): BackendSession {
  return {
    ...session,
    status: normalizeSessionStatus(session.status),
  };
}

export async function listClasses(status?: BackendClassStatus): Promise<BackendClass[]> {
  const data = await apiRequest<{ classes: RawBackendClass[] }>(
    `/classes${buildQuery({ status })}`,
  );
  return data.classes.map(normalizeBackendClass);
}

export async function createClass(payload: {
  name: string;
  fee_per_session: number;
}): Promise<BackendClass> {
  const data = await apiRequest<{ class: RawBackendClass }>("/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeBackendClass(data.class);
}

export async function updateClass(
  classId: number,
  payload: {
    name?: string;
    fee_per_session?: number;
  },
): Promise<BackendClass> {
  const data = await apiRequest<{ class: RawBackendClass }>(`/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return normalizeBackendClass(data.class);
}

export async function archiveClass(classId: number): Promise<BackendClass> {
  const data = await apiRequest<{ class: RawBackendClass }>(`/classes/${classId}/archive`, {
    method: "POST",
  });

  return normalizeBackendClass(data.class);
}

export async function listClassSchedules(classId: number): Promise<BackendClassSchedule[]> {
  const data = await apiRequest<{ schedules: BackendClassSchedule[] }>(`/classes/${classId}/schedules`);
  return data.schedules;
}

export async function createClassSchedule(
  classId: number,
  payload: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  },
): Promise<{ schedule: BackendClassSchedule; sessions_created: number }> {
  return apiRequest<{ schedule: BackendClassSchedule; sessions_created: number }>(
    `/classes/${classId}/schedules`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateClassSchedule(
  classId: number,
  scheduleId: number,
  payload: {
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
  },
): Promise<{ schedule: BackendClassSchedule; sessions_created: number }> {
  return apiRequest<{ schedule: BackendClassSchedule; sessions_created: number }>(
    `/classes/${classId}/schedules/${scheduleId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteClassSchedule(classId: number, scheduleId: number): Promise<void> {
  await apiRequest<void>(`/classes/${classId}/schedules/${scheduleId}`, {
    method: "DELETE",
  });
}

export async function listSessions(filters?: {
  class_id?: number;
  status?: BackendSessionStatus;
}): Promise<BackendSession[]> {
  const data = await apiRequest<{ sessions: RawBackendSession[] }>(
    `/sessions${buildQuery({ class_id: filters?.class_id, status: filters?.status })}`,
  );

  return data.sessions.map(normalizeBackendSession);
}

export async function createManualSession(
  classId: number,
  payload: {
    scheduled_date: string;
    start_time: string;
  },
): Promise<BackendSession> {
  const data = await apiRequest<{ session: RawBackendSession }>(`/classes/${classId}/sessions/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return normalizeBackendSession(data.session);
}

export async function cancelSession(sessionId: number): Promise<BackendSession> {
  const data = await apiRequest<{ session: RawBackendSession }>(`/sessions/${sessionId}/cancel`, {
    method: "POST",
  });

  return normalizeBackendSession(data.session);
}

async function mapBackendClassesToFrontendClasses(): Promise<Class[]> {
  const classes = await listClasses();

  const scheduleSummaryByClassId = new Map<number, string>();
  await Promise.all(
    classes.map(async (classItem) => {
      try {
        const schedules = await listClassSchedules(classItem.id);
        scheduleSummaryByClassId.set(classItem.id, formatScheduleSummary(schedules));
      } catch {
        scheduleSummaryByClassId.set(classItem.id, "Không tải được lịch");
      }
    }),
  );

  return classes.map((classItem) => ({
    id: String(classItem.id),
    name: classItem.name,
    schedule: scheduleSummaryByClassId.get(classItem.id) ?? "Chưa thiết lập",
    feePerSession: parseFeePerSession(classItem.fee_per_session),
    status: classItem.status,
    studentCount: 0,
  }));
}

export async function syncClassesFromBackendToMockData(): Promise<void> {
  const classes = await mapBackendClassesToFrontendClasses();
  mockClasses.splice(0, mockClasses.length, ...classes);
}

export async function bootstrapClassData(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      // Do not keep hardcoded class rows when switching to backend data.
      mockClasses.splice(0, mockClasses.length);

      try {
        await syncClassesFromBackendToMockData();
      } catch (error) {
        console.error("Failed to load class data from backend", error);
      }
    })();
  }

  await bootstrapPromise;
}
