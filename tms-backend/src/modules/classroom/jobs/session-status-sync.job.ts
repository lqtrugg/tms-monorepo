import type { IntervalJob } from '../../../jobs/index.js';
import { SyncSessionStatusesUseCase } from '../application/jobs/SyncSessionStatusesUseCase.js';

const DEFAULT_SYNC_INTERVAL_MS = 15_000;
const syncSessionStatuses = new SyncSessionStatusesUseCase();

export async function syncSessionStatusesOnce(): Promise<void> {
  return syncSessionStatuses.execute();
}

export function createSessionStatusSyncJob(options: {
  enabled: boolean;
  intervalMs?: number;
}): IntervalJob {
  return {
    name: 'session-status-sync',
    enabled: options.enabled,
    intervalMs: options.intervalMs ?? DEFAULT_SYNC_INTERVAL_MS,
    run: syncSessionStatusesOnce,
  };
}
