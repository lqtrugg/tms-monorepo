import { In } from 'typeorm';

import { AppDataSource } from '../data-source.js';
import { DiscordServer, Teacher, Topic } from '../entities/index.js';
import {
  extractGymIdFromLink,
  fetchCodeforcesGymMetadata,
  resolveCodeforcesCredentials,
  type CodeforcesCredentials,
} from './codeforces-api.service.js';
import { fetchDiscordGuildMetadata } from './discord-api.service.js';

let autoSyncTimer: NodeJS.Timeout | null = null;
let isAutoSyncRunning = false;

async function fetchDiscordServerName(discordServerId: string, botToken: string): Promise<string | null> {
  try {
    const guild = await fetchDiscordGuildMetadata(discordServerId, botToken);
    return guild.name;
  } catch {
    return null;
  }
}

function hasPartialCodeforcesCredentials(teacher: Teacher): boolean {
  const hasApiKey = typeof teacher.codeforces_api_key === 'string' && teacher.codeforces_api_key.trim().length > 0;
  const hasApiSecret = typeof teacher.codeforces_api_secret === 'string'
    && teacher.codeforces_api_secret.trim().length > 0;

  return hasApiKey !== hasApiSecret;
}

async function buildCodeforcesCredentialsByTeacherId(
  teacherIds: number[],
): Promise<Map<number, CodeforcesCredentials | null>> {
  if (teacherIds.length === 0) {
    return new Map<number, CodeforcesCredentials | null>();
  }

  const teachers = await AppDataSource.getRepository(Teacher).findBy({
    id: In(teacherIds),
  });

  const map = new Map<number, CodeforcesCredentials | null>();

  for (const teacher of teachers) {
    if (hasPartialCodeforcesCredentials(teacher)) {
      console.warn(`[auto-sync] teacher ${teacher.id} has partial Codeforces credentials; using public API fallback`);
    }

    map.set(
      teacher.id,
      resolveCodeforcesCredentials(teacher.codeforces_api_key, teacher.codeforces_api_secret),
    );
  }

  return map;
}

async function fetchCodeforcesGymMetadataSafely(
  gymId: string,
  credentials: CodeforcesCredentials | null,
): Promise<{ gym_id: string; title: string } | null> {
  try {
    return await fetchCodeforcesGymMetadata(gymId, credentials);
  } catch {
    return null;
  }
}

async function syncDiscordServersOnce(): Promise<void> {
  const repo = AppDataSource.getRepository(DiscordServer);
  const servers = await repo.find();
  const dirty: DiscordServer[] = [];

  for (const server of servers) {
    if (!server.bot_token) {
      continue;
    }

    const syncedName = await fetchDiscordServerName(server.discord_server_id, server.bot_token);
    if (!syncedName || syncedName === server.name) {
      continue;
    }

    server.name = syncedName;
    dirty.push(server);
  }

  if (dirty.length > 0) {
    await repo.save(dirty);
    console.log(`[auto-sync] discord servers updated: ${dirty.length}`);
  }
}

async function syncCodeforcesTopicsOnce(): Promise<void> {
  const repo = AppDataSource.getRepository(Topic);
  const topics = await repo.find();
  const dirty: Topic[] = [];

  const teacherIds = Array.from(new Set(topics.map((topic) => topic.teacher_id)));
  const credentialsByTeacherId = await buildCodeforcesCredentialsByTeacherId(teacherIds);

  for (const topic of topics) {
    const gymId = topic.gym_id ?? extractGymIdFromLink(topic.gym_link);
    if (!gymId) {
      continue;
    }

    const credentials = credentialsByTeacherId.get(topic.teacher_id) ?? null;
    const synced = await fetchCodeforcesGymMetadataSafely(gymId, credentials);
    if (!synced) {
      continue;
    }

    if (topic.gym_id === synced.gym_id && topic.title === synced.title) {
      continue;
    }

    topic.gym_id = synced.gym_id;
    topic.title = synced.title;
    dirty.push(topic);
  }

  if (dirty.length > 0) {
    await repo.save(dirty);
    console.log(`[auto-sync] codeforces topics updated: ${dirty.length}`);
  }
}

export async function runAutoSyncOnce(options: {
  syncDiscord: boolean;
  syncCodeforces: boolean;
}): Promise<void> {
  if (!AppDataSource.isInitialized || isAutoSyncRunning) {
    return;
  }

  isAutoSyncRunning = true;

  try {
    if (options.syncDiscord) {
      await syncDiscordServersOnce();
    }

    if (options.syncCodeforces) {
      await syncCodeforcesTopicsOnce();
    }
  } catch (error) {
    console.error('[auto-sync] failed', error);
  } finally {
    isAutoSyncRunning = false;
  }
}

export function startAutoSyncScheduler(options: {
  intervalMinutes: number;
  syncDiscord: boolean;
  syncCodeforces: boolean;
}): void {
  if (autoSyncTimer) {
    return;
  }

  const intervalMs = Math.max(1, options.intervalMinutes) * 60 * 1000;
  void runAutoSyncOnce({
    syncDiscord: options.syncDiscord,
    syncCodeforces: options.syncCodeforces,
  });

  autoSyncTimer = setInterval(() => {
    void runAutoSyncOnce({
      syncDiscord: options.syncDiscord,
      syncCodeforces: options.syncCodeforces,
    });
  }, intervalMs);

  if (typeof autoSyncTimer.unref === 'function') {
    autoSyncTimer.unref();
  }

  console.log(`[auto-sync] scheduler started (interval=${options.intervalMinutes}m)`);
}

export function stopAutoSyncScheduler(): void {
  if (!autoSyncTimer) {
    return;
  }

  clearInterval(autoSyncTimer);
  autoSyncTimer = null;
  console.log('[auto-sync] scheduler stopped');
}
