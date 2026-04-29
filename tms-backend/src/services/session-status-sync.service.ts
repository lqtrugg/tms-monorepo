import { AppDataSource } from '../data-source.js';

const DEFAULT_SYNC_INTERVAL_MS = 15_000;

let sessionStatusTimer: NodeJS.Timeout | null = null;
let isSessionStatusSyncRunning = false;

type UpdatedSessionRow = {
  id: number;
};

function getUpdatedSessionCount(result: unknown): number {
  if (Array.isArray(result) && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[1];
  }

  if (Array.isArray(result)) {
    return result.length;
  }

  return 0;
}

export async function syncSessionStatusesOnce(): Promise<void> {
  if (!AppDataSource.isInitialized || isSessionStatusSyncRunning) {
    return;
  }

  isSessionStatusSyncRunning = true;

  try {
    const completedResult = await AppDataSource.query(`
      UPDATE sessions AS session
      SET status = 'completed'::session_status
      FROM classes AS class
      WHERE session.teacher_id = class.teacher_id
        AND session.class_id = class.id
        AND class.status = 'active'::class_status
        AND session.end_time IS NOT NULL
        AND session.status IN ('scheduled'::session_status, 'in_progress'::session_status)
        AND CURRENT_TIMESTAMP >= (session.scheduled_at::date + session.end_time)::timestamptz
      RETURNING session.id
    `) as UpdatedSessionRow[] | [UpdatedSessionRow[], number];

    const startedResult = await AppDataSource.query(`
      UPDATE sessions AS session
      SET status = 'in_progress'::session_status
      FROM classes AS class
      WHERE session.teacher_id = class.teacher_id
        AND session.class_id = class.id
        AND class.status = 'active'::class_status
        AND session.end_time IS NOT NULL
        AND session.status = 'scheduled'::session_status
        AND CURRENT_TIMESTAMP >= session.scheduled_at
        AND CURRENT_TIMESTAMP < (session.scheduled_at::date + session.end_time)::timestamptz
      RETURNING session.id
    `) as UpdatedSessionRow[] | [UpdatedSessionRow[], number];

    const completedCount = getUpdatedSessionCount(completedResult);
    const startedCount = getUpdatedSessionCount(startedResult);

    if (startedCount > 0 || completedCount > 0) {
      console.log(
        `[session-status] synced: started=${startedCount}, completed=${completedCount}`,
      );
    }
  } catch (error) {
    console.error('[session-status] sync failed', error);
  } finally {
    isSessionStatusSyncRunning = false;
  }
}

export function startSessionStatusSync(intervalMs = DEFAULT_SYNC_INTERVAL_MS): void {
  if (sessionStatusTimer) {
    return;
  }

  void syncSessionStatusesOnce();
  sessionStatusTimer = setInterval(() => {
    void syncSessionStatusesOnce();
  }, Math.max(5_000, intervalMs));

  if (typeof sessionStatusTimer.unref === 'function') {
    sessionStatusTimer.unref();
  }

  console.log(`[session-status] scheduler started (interval=${Math.max(5_000, intervalMs)}ms)`);
}

export function stopSessionStatusSync(): void {
  if (!sessionStatusTimer) {
    return;
  }

  clearInterval(sessionStatusTimer);
  sessionStatusTimer = null;
  console.log('[session-status] scheduler stopped');
}
