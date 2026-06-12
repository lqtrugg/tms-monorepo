import config from '../../../../config.js';
import { AppDataSource } from '../../../../infrastructure/database/data-source.js';
import {
  getCodeforcesCredential,
  listTeacherIdsForCodeforcesSync,
} from '../../../account/infrastructure/persistence/typeorm/Writer.js';
import {
  CodeforcesClient,
  CodeforcesGym,
  type CodeforcesContestListItem,
} from '../../../../infrastructure/external/codeforces/codeforces.js';
import { startSyncLoop, type SyncLoop } from '../../../../infrastructure/sync/sync-loop.js';
import { listBoundGyms } from '../persistence/typeorm/Reader.js';
import { syncCodeforcesGymCatalog, syncGymStanding } from '../persistence/typeorm/Writer.js';

export type TeacherSyncResult = {
  teacherId: number;
  skipped: boolean;
  skipReason?: string;
  syncedCatalog: number;
  syncedStandings: number;
};

// ─── CodeforcesWorker ────────────────────────────────────────────────────────

/**
 * Orchestrates Codeforces data sync per teacher.
 *
 * Uses the `topics` table for everything:
 *   - Catalog entries: topics with class_id = NULL (synced gym info, not bound to a class)
 *   - Bound entries: topics with class_id != NULL (gym bound to a class, has standings)
 *
 * Workflow per teacher:
 *   1. Load credentials + codeforces_handle from TeacherCodeforcesCredential
 *   2. If credentials/handle incomplete → skip
 *   3. Fetch visible gyms → filter by preparedBy === ownerHandle
 *   4. Find bound gyms for the teacher (credential-owned gym with class_id owned by teacher)
 *   5. For each bound gym → fetch standings → sync problems + standings
 *
 * Codeforces is the source of truth. Local entities are cache only.
 */
export class CodeforcesWorker {
  /**
   * Sync all Codeforces data for a single teacher.
   */
  async syncTeacher(teacherId: number): Promise<TeacherSyncResult> {
    const skipResult = (reason: string): TeacherSyncResult => ({
      teacherId,
      skipped: true,
      skipReason: reason,
      syncedCatalog: 0,
      syncedStandings: 0,
    });

    if (!AppDataSource.isInitialized) {
      return skipResult('database_not_initialized');
    }

    // Step 1: Load and validate teacher config
    const config = await getCodeforcesCredential(teacherId);
    const apiKey = config?.codeforces_api_key;
    const apiSecret = config?.codeforces_api_secret;
    const ownerHandle = config?.codeforces_handle;

    if (!apiKey || !apiSecret || !ownerHandle) {
      return skipResult('incomplete_credentials');
    }

    const credentials = { apiKey, apiSecret };
    const codeforcesGym = new CodeforcesGym(CodeforcesClient.getInstance(), credentials);
    const now = new Date();
    let syncedCatalog = 0;
    let syncedStandings = 0;

    // Step 2: Check credential health and fetch visible gyms for the credential owner.
    let ownedGyms: CodeforcesContestListItem[];
    try {
      ownedGyms = await codeforcesGym.getGymsByCredential(ownerHandle);
      console.log(
        `[codeforces-sync] teacher=${teacherId}, handle=${ownerHandle}, credential_health=ok, owned_gyms=${ownedGyms.length}`,
      );
    } catch (error) {
      console.warn(`[codeforces-sync] teacher=${teacherId}, credential_health=failed`, error);
      return skipResult('api_error');
    }

    // Step 3: Sync gym catalog.
    // Upsert uses owner_handle + gym_id as the logical key:
    // - existing row: refresh title, gym_link, and last_pulled_at without changing class_id
    // - new row: insert catalog gym with class_id = NULL, so it is available to bind later
    // - stale cleanup: delete only unbound catalog rows that Codeforces no longer returns
    try {
      syncedCatalog = await syncCodeforcesGymCatalog(teacherId, ownerHandle, ownedGyms, now);
    } catch (error) {
      console.warn(`[codeforces-sync] teacher=${teacherId}, failed to sync gym catalog`, error);
    }

    // Step 4: Find bound gyms.
    // A gym is bounded if it has class_id != NULL and the class_id belongs to this teacher
    const boundGyms = await listBoundGyms(teacherId);

    // Step 5: Fetch and sync standings for each bound gym.
    for (const gym of boundGyms) {
      const gymId = gym.gym_id;

      // Fetch gym snapshot (problems + standings) from Codeforces API
      let standings: Awaited<ReturnType<CodeforcesGym['getGymSnapshot']>>;
      try {
        standings = await codeforcesGym.getGymSnapshot(gymId);
      } catch (error) {
        console.warn(`[codeforces-sync] teacher=${teacherId}, gym=${gymId}, failed to fetch standings`, error);
        continue;
      }

      // Sync gym snapshot (problems + standings) to local database
      try {
        if (await syncGymStanding({
          teacherId,
          gymId: gym.id,
          classId: gym.class_id,
          standings,
          pulledAt: now,
        })) {
          syncedStandings += 1;
        }
      } catch (error) {
        console.warn(`[codeforces-sync] teacher=${teacherId}, gym=${gym.id}, failed to sync standing`, error);
      }
    }

    console.log(
      `[codeforces-sync] teacher=${teacherId}, catalog=${syncedCatalog}, bound_gyms=${boundGyms.length}, standings_synced=${syncedStandings}`,
    );

    return { teacherId, skipped: false, syncedCatalog, syncedStandings };
  }
}

// ─── Worker Entry Point ──────────────────────────────────────────────────────

export function startCodeforcesSyncWorker(): SyncLoop {
  const worker = new CodeforcesWorker();

  return startSyncLoop({
    name: 'codeforces',
    getDelayMs: async () => config.sync.intervalSeconds * 1000,
    run: async () => {
      const teacherIds = await listTeacherIdsForCodeforcesSync();

      let totalCatalog = 0;
      let totalStandings = 0;
      let skippedCount = 0;

      for (const teacherId of teacherIds) {
        const result = await worker.syncTeacher(teacherId);
        if (result.skipped) {
          skippedCount += 1;
        } else {
          totalCatalog += result.syncedCatalog;
          totalStandings += result.syncedStandings;
        }
      }

      if (teacherIds.length > 0) {
        console.log(
          `[sync] codeforces pass: teachers=${teacherIds.length}, skipped=${skippedCount}, catalog=${totalCatalog}, standings=${totalStandings}`,
        );
      }
    },
  });
}
