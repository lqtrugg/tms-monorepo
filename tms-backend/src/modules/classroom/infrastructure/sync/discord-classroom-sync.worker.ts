import { In } from 'typeorm';

import config from '../../../../config.js';
import { AppDataSource } from '../../../../infrastructure/database/data-source.js';
import {
  addDiscordGuildMember,
  checkDiscordBotTokenHealth,
  DiscordVoice,
  fetchDiscordGuildMetadata,
  kickDiscordGuildMember,
  listDiscordGuildChannels,
  type DiscordGuildMemberIdentity,
} from '../../../../infrastructure/external/discord/discord.js';
import { TypeOrmDiscordCacheStore } from '../../../../infrastructure/external/discord/cache/discord-cache.store.js';
import { startSyncLoop, type SyncLoop } from '../../../../infrastructure/sync/sync-loop.js';
import { refreshStudentDiscordToken } from '../../../../infrastructure/security/discord-oauth.js';
import { HttpError } from '../../../../shared/errors/HttpError.js';
import {
  toVietnamDateParts,
  vietnamDateTimeToUtcDate,
} from '../../../../shared/time/vietnam-time.js';
import { listStudentIdsByClassAtTime } from '../../../student/infrastructure/persistence/typeorm/Reader.js';
import { StudentStatus } from '../../../student/contracts/types.js';
import {
  findDefaultDiscordBotCredential,
  findTeacherDiscordUserId,
  listStudentDiscordIdentities,
  listTeacherIdsWithDiscordUserId,
  updateDefaultDiscordBotHealth,
} from '../../../account/infrastructure/persistence/typeorm/Writer.js';
import { AttendanceSource, AttendanceStatus, ClassStatus, SessionStatus } from '../../contracts/types.js';
import { TypeOrmAttendanceWriter, TypeOrmSessionFinanceService } from '../persistence/typeorm/Writer.js';
import { Class } from '../../../../infrastructure/database/entities/class.entity.js';
import { ClassDiscordBinding } from '../../../../infrastructure/database/entities/discord/class-discord-binding.entity.js';
import { Enrollment } from '../../../../infrastructure/database/entities/enrollment.entity.js';
import { Session } from '../../../../infrastructure/database/entities/session.entity.js';
import { Student } from '../../../../infrastructure/database/entities/student.entity.js';
import { StudentDiscordCredential } from '../../../../infrastructure/database/entities/student-discord-credential.entity.js';

// ─── Types ───────────────────────────────────────────────────────────────────

type OpenVoiceAttendanceSession = {
  teacher_id: number;
  class_id: number;
  session_id: number;
  discord_guild_id: string;
  attendance_voice_channel_id: string;
  bot_token: string;
};

type VoiceAttendanceStudentIdentity = {
  student_id: number;
  discord_user_id: string | null;
  discord_username: string | null;
};

type StudentDiscordMembershipSyncRow = {
  credential_id: number;
  teacher_id: number;
  student_id: number;
  discord_user_id: string;
  current_guild_id: string | null;
  target_guild_id: string | null;
  discord_access_token: string | null;
  discord_refresh_token: string | null;
  discord_token_expires_at: Date | null;
};

type UpdatedSessionRow = {
  id: number;
};

type MaterializeSessionRow = {
  id: number;
  teacher_id: number;
};

// ─── Discord Bot Health ──────────────────────────────────────────────────────

/**
 * Checks the default Discord bot token and stores the latest health result.
 *
 * Missing database or bot token is treated as "nothing to sync yet", so this
 * pass exits quietly instead of failing the whole worker.
 */
export async function checkDiscordBotHealthOnce(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    return;
  }

  const credential = await findDefaultDiscordBotCredential();
  if (!credential?.bot_token) {
    return;
  }

  const checkedAt = new Date();
  let status: 'healthy' | 'unhealthy';
  let message: string;
  try {
    const health = await checkDiscordBotTokenHealth(credential.bot_token);
    status = health.healthy ? 'healthy' : 'unhealthy';
    message = health.message;
  } catch (error) {
    status = 'unhealthy';
    message = error instanceof Error ? error.message : 'Failed to check bot token health.';
  }

  await updateDefaultDiscordBotHealth({ status, message, checkedAt });
}

// ─── Guild + Channel Cache Sync ──────────────────────────────────────────────

/**
 * Lists teachers that linked a Discord user account.
 */
export async function listDiscordSyncTeacherIds(): Promise<number[]> {
  if (!AppDataSource.isInitialized) {
    return [];
  }

  return listTeacherIdsWithDiscordUserId();
}

/**
 * Refreshes Discord guild/channel cache for one teacher.
 *
 * Workflow:
 *   1. Load default bot token and teacher Discord user id
 *   2. Merge guild ids from user-owned cache and existing class bindings
 *   3. Fetch guild metadata and keep only bot-accessible guilds
 *   4. Replace cached guilds and prune stale class bindings
 *   5. Refresh channel cache for each accessible guild
 *
 * Discord is the source of truth. Local guild/channel rows are cache only.
 */
export async function syncDiscordGuildsForTeacherOnce(teacherId: number): Promise<{
  synced_guilds: number;
  removed_bindings: number;
}> {
  const credential = await findDefaultDiscordBotCredential();
  const botToken = credential?.bot_token?.trim();
  if (!botToken) {
    return { synced_guilds: 0, removed_bindings: 0 };
  }

  const discordUserId = await findTeacherDiscordUserId(teacherId);
  if (!discordUserId) {
    return { synced_guilds: 0, removed_bindings: 0 };
  }

  let removedBindings = 0;
  const discordCache = new TypeOrmDiscordCacheStore();

  // Step 1: Build the guild set relevant to this teacher.
  const [ownedGuilds, boundGuilds] = await Promise.all([
    discordCache.listGuildIdsForOwner(discordUserId),
    AppDataSource.getRepository(ClassDiscordBinding).find({
      where: { teacher_id: teacherId },
      select: { discord_guild_id: true },
    }),
  ]);
  const knownDiscordGuildIds = Array.from(new Set(
    [...ownedGuilds, ...boundGuilds]
      .map((guild) => (typeof guild === 'string' ? guild : guild.discord_guild_id).trim())
      .filter((discordGuildId) => discordGuildId.length > 0),
  ));
  const guilds: Array<{ id: string; name: string }> = [];

  // Step 2: Keep only guilds still accessible through the bot token.
  for (const discordGuildId of knownDiscordGuildIds) {
    try {
      guilds.push(await fetchDiscordGuildMetadata(botToken, discordGuildId));
    } catch {
      // Missing/inaccessible guilds are pruned after successful fetches are known.
    }
  }

  // Step 3: Replace guild cache and prune stale bindings in one transaction.
  await AppDataSource.transaction(async (manager) => {
    const transactionDiscordCache = new TypeOrmDiscordCacheStore(manager);
    const bindingRepo = manager.getRepository(ClassDiscordBinding);
    await transactionDiscordCache.replaceGuilds(
      discordUserId,
      guilds.map((guild) => ({ discord_guild_id: guild.id, name: guild.name })),
    );

    const syncedDiscordGuildIds = guilds.map((guild) => guild.id);
    const bindingDeleteQuery = bindingRepo
      .createQueryBuilder()
      .delete()
      .from(ClassDiscordBinding)
      .where('teacher_id = :teacherId', { teacherId });

    if (syncedDiscordGuildIds.length > 0) {
      bindingDeleteQuery.andWhere('discord_guild_id NOT IN (:...discordGuildIds)', {
        discordGuildIds: syncedDiscordGuildIds,
      });
    }

    const [bindingDelete] = await Promise.all([
      bindingDeleteQuery.execute(),
      transactionDiscordCache.deleteChannelsForOwnerExceptGuilds(discordUserId, syncedDiscordGuildIds),
    ]);
    removedBindings += bindingDelete.affected ?? 0;
  });

  // Step 4: Refresh channel cache for each accessible guild.
  for (const guild of guilds) {
    try {
      const channels = await listDiscordGuildChannels(botToken, guild.id);
      await discordCache.replaceChannels(
        discordUserId,
        guild.id,
        channels.map((channel) => ({
          discord_channel_id: channel.id,
          name: channel.name,
          type: channel.type,
        })),
      );
    } catch {
      // User guild remains; channel list will be retried by the next sync pass.
    }
  }

  return { synced_guilds: guilds.length, removed_bindings: removedBindings };
}

// ─── Student Guild Membership Sync ───────────────────────────────────────────

/**
 * Loads students whose Discord guild membership needs reconciliation.
 *
 * A row is included when the student has a verified Discord user id and either:
 *   - currently belongs to a Discord guild, or
 *   - should belong to a bound class guild through active enrollment.
 */
async function listStudentDiscordMembershipSyncRows(
  teacherId: number,
): Promise<StudentDiscordMembershipSyncRow[]> {
  const rows = await AppDataSource.getRepository(StudentDiscordCredential)
    .createQueryBuilder('credential')
    .innerJoin(Student, 'student', 'student.id = credential.student_id')
    .leftJoin(
      Enrollment,
      'enrollment',
      [
        'enrollment.teacher_id = student.teacher_id',
        'enrollment.student_id = student.id',
        'enrollment.unenrolled_at IS NULL',
        'student.status = :activeStatus',
      ].join(' AND '),
    )
    .leftJoin(
      ClassDiscordBinding,
      'discord_guild',
      [
        'discord_guild.teacher_id = student.teacher_id',
        'discord_guild.class_id = enrollment.class_id',
      ].join(' AND '),
    )
    .select('credential.id', 'credential_id')
    .addSelect('student.teacher_id', 'teacher_id')
    .addSelect('student.id', 'student_id')
    .addSelect('credential.discord_user_id', 'discord_user_id')
    .addSelect('credential.guild_id', 'current_guild_id')
    .addSelect('discord_guild.discord_guild_id', 'target_guild_id')
    .addSelect('credential.discord_access_token', 'discord_access_token')
    .addSelect('credential.discord_refresh_token', 'discord_refresh_token')
    .addSelect('credential.discord_token_expires_at', 'discord_token_expires_at')
    .where('student.teacher_id = :teacherId', { teacherId })
    .andWhere('credential.discord_user_id IS NOT NULL')
    .andWhere("LEN(TRIM(credential.discord_user_id)) > 0")
    .andWhere('(credential.guild_id IS NOT NULL OR discord_guild.discord_guild_id IS NOT NULL)', {
      activeStatus: StudentStatus.Active,
    })
    .getRawMany<{
      credential_id: number | string;
      teacher_id: number | string;
      student_id: number | string;
      discord_user_id: string;
      current_guild_id: string | null;
      target_guild_id: string | null;
      discord_access_token: string | null;
      discord_refresh_token: string | null;
      discord_token_expires_at: Date | string | null;
    }>();

  return rows.map((row) => ({
    credential_id: Number(row.credential_id),
    teacher_id: Number(row.teacher_id),
    student_id: Number(row.student_id),
    discord_user_id: row.discord_user_id,
    current_guild_id: row.current_guild_id?.trim() || null,
    target_guild_id: row.target_guild_id?.trim() || null,
    discord_access_token: row.discord_access_token,
    discord_refresh_token: row.discord_refresh_token,
    discord_token_expires_at: row.discord_token_expires_at
      ? new Date(row.discord_token_expires_at)
      : null,
  }));
}

/**
 * Returns a usable student Discord access token for guild join operations.
 *
 * Uses the stored token when it has enough remaining lifetime; otherwise tries
 * to refresh the token and persists the refreshed credential.
 */
async function getValidStudentDiscordAccessToken(input: {
  row: StudentDiscordMembershipSyncRow;
  clientId: string | null | undefined;
  clientSecret: string | null | undefined;
}): Promise<string | null> {
  const accessToken = input.row.discord_access_token?.trim() || null;
  const expiresAt = input.row.discord_token_expires_at;
  if (accessToken && expiresAt && expiresAt.getTime() > Date.now() + 60_000) {
    return accessToken;
  }

  const refreshToken = input.row.discord_refresh_token?.trim() || null;
  if (!refreshToken || !input.clientId || !input.clientSecret) {
    return null;
  }

  try {
    const refreshed = await refreshStudentDiscordToken({
      refreshToken,
      clientId: input.clientId,
      clientSecret: input.clientSecret,
    });
    await AppDataSource.getRepository(StudentDiscordCredential).update(
      { id: input.row.credential_id },
      {
        discord_access_token: refreshed.accessToken,
        discord_refresh_token: refreshed.refreshToken,
        discord_token_expires_at: refreshed.expiresAt,
      },
    );
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

/**
 * Reconciles one student's Discord guild membership.
 *
 * Local desired state comes from active enrollment plus class Discord binding:
 *   - no target guild: kick from current guild
 *   - different target guild: kick from old guild, then add to new guild
 *   - same target guild: no-op
 */
async function reconcileStudentDiscordMembershipRow(input: {
  row: StudentDiscordMembershipSyncRow;
  botToken: string;
  clientId: string | null | undefined;
  clientSecret: string | null | undefined;
}): Promise<'added' | 'kicked' | 'moved' | 'skipped' | 'unchanged'> {
  const targetGuildId = input.row.target_guild_id;
  const currentGuildId = input.row.current_guild_id;

  // Step 1: Nothing to do when persisted guild already matches desired guild.
  if (currentGuildId === targetGuildId) {
    return 'unchanged';
  }

  // Step 2: Remove stale membership before adding a new one.
  if (currentGuildId) {
    await kickDiscordGuildMember({
      botToken: input.botToken,
      guildId: currentGuildId,
      userId: input.row.discord_user_id,
    });

    await AppDataSource.getRepository(StudentDiscordCredential).update(
      { id: input.row.credential_id },
      { guild_id: null },
    );
  }

  // Step 3: If no class guild is desired, the kick completed the sync.
  if (!targetGuildId) {
    return currentGuildId ? 'kicked' : 'unchanged';
  }

  // Step 4: Discord requires a valid user access token to add a guild member.
  const accessToken = await getValidStudentDiscordAccessToken({
    row: input.row,
    clientId: input.clientId,
    clientSecret: input.clientSecret,
  });
  if (!accessToken) {
    return 'skipped';
  }

  await addDiscordGuildMember({
    botToken: input.botToken,
    guildId: targetGuildId,
    userId: input.row.discord_user_id,
    userAccessToken: accessToken,
  });

  await AppDataSource.getRepository(StudentDiscordCredential).update(
    { id: input.row.credential_id },
    { guild_id: targetGuildId },
  );

  if (currentGuildId && targetGuildId) {
    return 'moved';
  }

  return targetGuildId ? 'added' : 'kicked';
}

/**
 * Syncs Discord guild membership for all relevant students of one teacher.
 */
export async function syncStudentDiscordGuildMembershipForTeacherOnce(teacherId: number): Promise<{
  added: number;
  kicked: number;
  moved: number;
  skipped: number;
}> {
  if (!AppDataSource.isInitialized) {
    return { added: 0, kicked: 0, moved: 0, skipped: 0 };
  }

  const credential = await findDefaultDiscordBotCredential();
  const botToken = credential?.bot_token?.trim();
  if (!botToken) {
    return { added: 0, kicked: 0, moved: 0, skipped: 0 };
  }

  const rows = await listStudentDiscordMembershipSyncRows(teacherId);
  const result = { added: 0, kicked: 0, moved: 0, skipped: 0 };
  for (const row of rows) {
    try {
      const action = await reconcileStudentDiscordMembershipRow({
        row,
        botToken,
        clientId: credential?.client_id,
        clientSecret: credential?.client_secret,
      });
      if (action === 'added') {
        result.added += 1;
      } else if (action === 'kicked') {
        result.kicked += 1;
      } else if (action === 'moved') {
        result.moved += 1;
      } else if (action === 'skipped') {
        result.skipped += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      console.warn(
        `[sync] discord membership skipped teacher=${teacherId} student=${row.student_id} current_guild=${row.current_guild_id ?? 'none'} target_guild=${row.target_guild_id ?? 'none'} error=${message}`,
      );
      result.skipped += 1;
    }
  }

  return result;
}

/**
 * Lists teachers that have at least one student with Discord membership work.
 */
export async function listStudentDiscordMembershipSyncTeacherIds(): Promise<number[]> {
  if (!AppDataSource.isInitialized) {
    return [];
  }

  const rows = await AppDataSource.getRepository(StudentDiscordCredential)
    .createQueryBuilder('credential')
    .innerJoin(Student, 'student', 'student.id = credential.student_id')
    .leftJoin(
      Enrollment,
      'enrollment',
      [
        'enrollment.teacher_id = student.teacher_id',
        'enrollment.student_id = student.id',
        'enrollment.unenrolled_at IS NULL',
        'student.status = :activeStatus',
      ].join(' AND '),
    )
    .leftJoin(
      ClassDiscordBinding,
      'discord_guild',
      [
        'discord_guild.teacher_id = student.teacher_id',
        'discord_guild.class_id = enrollment.class_id',
      ].join(' AND '),
    )
    .select('DISTINCT student.teacher_id', 'teacher_id')
    .where('credential.discord_user_id IS NOT NULL')
    .andWhere("LEN(TRIM(credential.discord_user_id)) > 0")
    .andWhere('(credential.guild_id IS NOT NULL OR discord_guild.discord_guild_id IS NOT NULL)', {
      activeStatus: StudentStatus.Active,
    })
    .getRawMany<{ teacher_id: number | string }>();

  return rows.map((row) => Number(row.teacher_id));
}

// ─── Session Status + Attendance Materialization ─────────────────────────────

/**
 * Calculates the concrete UTC end datetime for a session.
 *
 * `scheduled_at` carries the Vietnam calendar date, while `end_time` carries
 * the local wall-clock time for that same date.
 */
function getSessionEndAt(session: Pick<Session, 'scheduled_at' | 'end_time'>): Date | null {
  if (!session.end_time) {
    return null;
  }

  const [hours = '0', minutes = '0', seconds = '0'] = session.end_time.split(':');
  const parts = toVietnamDateParts(session.scheduled_at);
  return vietnamDateTimeToUtcDate(parts.year, parts.month, parts.day, Number(hours), Number(minutes), Number(seconds), 0);
}

/**
 * Ensures a session has system attendance rows and matching fee records.
 *
 * This runs before status transitions so scheduled/in-progress sessions have
 * attendance and finance projections once the session time starts.
 */
async function materializeSessionAttendance(input: {
  attendanceWriter: TypeOrmAttendanceWriter;
  finance: TypeOrmSessionFinanceService;
  teacherId: number;
  sessionId: number;
}): Promise<{
  attendance_created: number;
  fee_records_synced: number;
}> {
  const session = await input.attendanceWriter.findSessionById(input.teacherId, input.sessionId);

  if (!session) {
    throw new HttpError('session not found', 404);
  }

  if (session.isCancelled()) {
    return {
      attendance_created: 0,
      fee_records_synced: 0,
    };
  }

  const classEntity = await input.attendanceWriter.findClassById(input.teacherId, session.class_id);

  if (!classEntity) {
    throw new HttpError('class not found', 404);
  }

  const enrollments = await input.attendanceWriter.findEnrollmentsAtSessionTime(
    input.teacherId,
    session.class_id,
    session.scheduled_at,
  );

  let attendanceCreated = 0;
  let feeRecordsSynced = 0;

  for (const enrollment of enrollments) {
    let attendance = await input.attendanceWriter.findAttendanceForStudent(
      input.teacherId,
      input.sessionId,
      enrollment.student_id,
    );

    if (!attendance) {
      attendance = input.attendanceWriter.create({
        teacher_id: input.teacherId,
        session_id: input.sessionId,
        student_id: enrollment.student_id,
        status: AttendanceStatus.AbsentUnexcused,
        source: AttendanceSource.System,
        overridden_at: null,
        notes: null,
      });
      attendance = await input.attendanceWriter.save(attendance);
      attendanceCreated += 1;
    }

    const shouldCharge = attendance.status === AttendanceStatus.Present
      || attendance.status === AttendanceStatus.AbsentUnexcused;

    await input.finance.syncAttendanceFeeRecord({
      teacherId: input.teacherId,
      sessionId: session.id,
      studentId: enrollment.student_id,
      enrollmentId: enrollment.id,
      amount: classEntity.fee_per_session,
      shouldCharge,
    });
    feeRecordsSynced += 1;
  }

  return {
    attendance_created: attendanceCreated,
    fee_records_synced: feeRecordsSynced,
  };
}

/**
 * Lists teachers with active classes and sessions that may need status updates.
 */
export async function listSessionStatusSyncTeacherIds(): Promise<number[]> {
  if (!AppDataSource.isInitialized) {
    return [];
  }

  const rows = await AppDataSource
    .getRepository(Session)
    .createQueryBuilder('session')
    .innerJoin(
      Class,
      'class',
      'class.teacher_id = session.teacher_id AND class.id = session.class_id',
    )
    .select('DISTINCT session.teacher_id', 'teacher_id')
    .where('class.status = :classStatus', { classStatus: ClassStatus.Active })
    .andWhere('session.end_time IS NOT NULL')
    .andWhere('session.status IN (:...statuses)', {
      statuses: [SessionStatus.Scheduled, SessionStatus.InProgress],
    })
    .andWhere('CURRENT_TIMESTAMP >= session.scheduled_at')
    .getRawMany<{ teacher_id: number }>();

  return rows.map((row) => Number(row.teacher_id));
}

/**
 * Advances session statuses and materializes attendance/fee projections.
 *
 * Workflow per teacher:
 *   1. Load active scheduled/in-progress sessions whose date has started
 *   2. Create missing attendance rows and sync fee records
 *   3. Mark sessions completed when current time is past end time
 *   4. Mark scheduled sessions in-progress once scheduled time has arrived
 */
export async function syncSessionStatusesForTeacherOnce(teacherId: number): Promise<{
  started: number;
  completed: number;
  attendance_created: number;
  fee_records_synced: number;
}> {
  if (!AppDataSource.isInitialized) {
    return { started: 0, completed: 0, attendance_created: 0, fee_records_synced: 0 };
  }

  // Step 1: Load sessions eligible for worker-driven status changes.
  const activeSessions = await AppDataSource
    .getRepository(Session)
    .createQueryBuilder('session')
    .innerJoin(
      Class,
      'class',
      'class.teacher_id = session.teacher_id AND class.id = session.class_id',
    )
    .where('class.status = :classStatus', { classStatus: ClassStatus.Active })
    .andWhere('session.teacher_id = :teacherId', { teacherId })
    .andWhere('session.end_time IS NOT NULL')
    .andWhere('session.status IN (:...statuses)', {
      statuses: [SessionStatus.Scheduled, SessionStatus.InProgress],
    })
    .andWhere('CURRENT_TIMESTAMP >= session.scheduled_at')
    .getMany();

  const materializeRows: MaterializeSessionRow[] = activeSessions.map((session) => ({
    id: session.id,
    teacher_id: session.teacher_id,
  }));

  // Step 2: Materialize attendance and finance rows for each eligible session.
  let attendanceCreated = 0;
  let feeRecordsSynced = 0;
  for (const row of materializeRows) {
    const result = await AppDataSource.transaction(async (manager) => {
      const attendanceWriter = new TypeOrmAttendanceWriter(manager);
      const finance = new TypeOrmSessionFinanceService(manager);

      return materializeSessionAttendance({
        attendanceWriter,
        finance,
        teacherId: Number(row.teacher_id),
        sessionId: Number(row.id),
      });
    });
    attendanceCreated += result.attendance_created;
    feeRecordsSynced += result.fee_records_synced;
  }

  const now = new Date();
  const completedRows: UpdatedSessionRow[] = [];
  const startedRows: UpdatedSessionRow[] = [];

  // Step 3: Classify sessions into start/completion updates.
  for (const session of activeSessions) {
    const endAt = getSessionEndAt(session);
    if (!endAt) {
      continue;
    }

    if (now >= endAt) {
      completedRows.push({ id: session.id });
      continue;
    }

    if (session.status === SessionStatus.Scheduled && now >= session.scheduled_at) {
      startedRows.push({ id: session.id });
    }
  }

  if (completedRows.length > 0) {
    await AppDataSource.getRepository(Session).update(
      { id: In(completedRows.map((row) => row.id)) },
      { status: SessionStatus.Completed },
    );
  }

  if (startedRows.length > 0) {
    await AppDataSource.getRepository(Session).update(
      { id: In(startedRows.map((row) => row.id)) },
      { status: SessionStatus.InProgress },
    );
  }

  return {
    started: startedRows.length,
    completed: completedRows.length,
    attendance_created: attendanceCreated,
    fee_records_synced: feeRecordsSynced,
  };
}

// ─── Voice Attendance Sync ──────────────────────────────────────────────────

function normalizeDiscordIdentity(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/^@+/, '');
  return normalized && normalized.length > 0 ? normalized : null;
}

/**
 * Builds the set of Discord identity strings that can match a local student.
 */
function identityCandidates(identity: DiscordGuildMemberIdentity): Set<string> {
  const candidates = new Set<string>();
  const values = [
    identity.user_id,
    identity.username,
    identity.global_name,
    identity.nick,
    identity.username && identity.discriminator && identity.discriminator !== '0'
      ? `${identity.username}#${identity.discriminator}`
      : null,
  ];

  values.forEach((value) => {
    const normalized = normalizeDiscordIdentity(value);
    if (normalized) {
      candidates.add(normalized);
    }
  });

  return candidates;
}

/**
 * Chooses the best local Discord key for matching a student to a voice member.
 */
function studentDiscordKey(student: VoiceAttendanceStudentIdentity): string | null {
  return normalizeDiscordIdentity(student.discord_user_id)
    ?? normalizeDiscordIdentity(student.discord_username);
}

/**
 * Loads in-progress sessions that have Discord voice attendance configured.
 */
async function getOpenVoiceAttendanceSessions(teacherId?: number): Promise<OpenVoiceAttendanceSession[]> {
  const credential = await findDefaultDiscordBotCredential();
  const botToken = credential?.bot_token?.trim() || null;
  if (!botToken) {
    return [];
  }

  const rowsQuery = AppDataSource.getRepository(Session)
    .createQueryBuilder('session')
    .innerJoin(Class, 'class', 'class.id = session.class_id AND class.teacher_id = session.teacher_id')
    .innerJoin(
      ClassDiscordBinding,
      'discord_guild',
      'discord_guild.teacher_id = session.teacher_id AND discord_guild.class_id = session.class_id',
    )
    .select('session.teacher_id', 'teacher_id')
    .addSelect('session.class_id', 'class_id')
    .addSelect('session.id', 'session_id')
    .addSelect('discord_guild.discord_guild_id', 'discord_guild_id')
    .addSelect('discord_guild.attendance_voice_channel_id', 'attendance_voice_channel_id')
    .where('session.status = :sessionStatus', { sessionStatus: SessionStatus.InProgress })
    .andWhere('class.status = :classStatus', { classStatus: ClassStatus.Active })
    .andWhere('discord_guild.attendance_voice_channel_id IS NOT NULL');

  if (teacherId !== undefined) {
    rowsQuery.andWhere('session.teacher_id = :teacherId', { teacherId });
  }

  const rows = await rowsQuery.getRawMany<{
    teacher_id: number;
    class_id: number;
    session_id: number;
    discord_guild_id: string;
    attendance_voice_channel_id: string;
  }>();

  return rows
    .map((row) => ({
      teacher_id: Number(row.teacher_id),
      class_id: Number(row.class_id),
      session_id: Number(row.session_id),
      discord_guild_id: row.discord_guild_id,
      attendance_voice_channel_id: row.attendance_voice_channel_id,
      bot_token: botToken,
    }))
    .filter((row) => row.bot_token && row.attendance_voice_channel_id);
}

/**
 * Lists enrolled students for the class at the session's scheduled time.
 */
async function listStudentsByClassSession(
  teacherId: number,
  classId: number,
  sessionId: number,
): Promise<VoiceAttendanceStudentIdentity[]> {
  const session = await AppDataSource.getRepository(Session).findOneBy({
    id: sessionId,
    teacher_id: teacherId,
    class_id: classId,
  });

  if (!session) {
    return [];
  }

  const studentIds = await listStudentIdsByClassAtTime({
    teacherId,
    classId,
    at: session.scheduled_at,
  });
  return listStudentDiscordIdentities(studentIds);
}

/**
 * Marks students present when their verified Discord identity appears in voice.
 *
 * Manual attendance overrides are preserved by `markBotPresentIfNotManual`.
 */
async function markPresentStudentsForSession(
  session: OpenVoiceAttendanceSession,
  identities: DiscordGuildMemberIdentity[],
): Promise<number> {
  if (identities.length === 0) {
    return 0;
  }

  const presentKeys = new Set<string>();
  identities.forEach((identity) => {
    identityCandidates(identity).forEach((candidate) => presentKeys.add(candidate));
  });

  const students = await listStudentsByClassSession(session.teacher_id, session.class_id, session.session_id);
  let markedCount = 0;

  for (const student of students) {
    const key = studentDiscordKey(student);
    if (!key || !presentKeys.has(key)) {
      continue;
    }

    const attendance = await AppDataSource.transaction(async (manager) => {
      const attendanceWriter = new TypeOrmAttendanceWriter(manager);
      const finance = new TypeOrmSessionFinanceService(manager);

      return upsertBotSessionAttendance({
        attendanceWriter,
        finance,
        teacherId: session.teacher_id,
        sessionId: session.session_id,
        studentId: student.student_id,
      });
    });
    if (attendance) {
      markedCount += 1;
    }
  }

  return markedCount;
}

/**
 * Marks a single student's attendance as bot-present and syncs the fee record.
 */
async function upsertBotSessionAttendance(input: {
  attendanceWriter: TypeOrmAttendanceWriter;
  finance: TypeOrmSessionFinanceService;
  teacherId: number;
  sessionId: number;
  studentId: number;
}): Promise<boolean> {
  const session = await input.attendanceWriter.findSessionById(input.teacherId, input.sessionId);

  if (!session) {
    throw new HttpError('session not found', 404);
  }

  const classEntity = await input.attendanceWriter.findClassById(input.teacherId, session.class_id);

  if (!classEntity) {
    throw new HttpError('class not found', 404);
  }

  const student = await input.attendanceWriter.findStudentById(input.teacherId, input.studentId);

  if (!student) {
    throw new HttpError('student not found', 404);
  }

  const enrollment = await input.attendanceWriter.findEnrollmentAtSessionTime(
    input.teacherId,
    input.studentId,
    session.class_id,
    session.scheduled_at,
  );

  if (!enrollment) {
    throw new HttpError('student is not enrolled in class at this session', 409);
  }

  if (session.isCancelled()) {
    throw new HttpError('cannot update attendance for a cancelled session', 409);
  }

  const markedPresent = await input.attendanceWriter.markBotPresentIfNotManual({
    teacherId: input.teacherId,
    sessionId: input.sessionId,
    studentId: input.studentId,
  });

  if (!markedPresent) {
    return false;
  }

  await input.finance.syncAttendanceFeeRecord({
    teacherId: input.teacherId,
    sessionId: session.id,
    studentId: input.studentId,
    enrollmentId: enrollment.id,
    amount: classEntity.fee_per_session,
    shouldCharge: true,
  });

  return true;
}

/**
 * Pulls current Discord voice members and applies attendance for one session.
 */
async function syncOpenSession(session: OpenVoiceAttendanceSession): Promise<number> {
  const identities = await new DiscordVoice(session.bot_token).listVoiceChannelMembers(
    session.discord_guild_id,
    session.attendance_voice_channel_id,
  );

  return markPresentStudentsForSession(session, identities);
}

/**
 * Resolves and validates one teacher-owned session for manual voice sync.
 */
async function getVoiceAttendanceSessionForTeacher(
  teacherId: number,
  sessionId: number,
): Promise<OpenVoiceAttendanceSession> {
  const credential = await findDefaultDiscordBotCredential();
  const botToken = credential?.bot_token?.trim() || null;
  const row = await AppDataSource.getRepository(Session)
    .createQueryBuilder('session')
    .innerJoin(Class, 'class', 'class.id = session.class_id AND class.teacher_id = session.teacher_id')
    .innerJoin(
      ClassDiscordBinding,
      'discord_guild',
      'discord_guild.teacher_id = session.teacher_id AND discord_guild.class_id = session.class_id',
    )
    .select('session.teacher_id', 'teacher_id')
    .addSelect('session.class_id', 'class_id')
    .addSelect('session.id', 'session_id')
    .addSelect('session.status', 'session_status')
    .addSelect('discord_guild.discord_guild_id', 'discord_guild_id')
    .addSelect('discord_guild.attendance_voice_channel_id', 'attendance_voice_channel_id')
    .where('session.id = :sessionId', { sessionId })
    .andWhere('session.teacher_id = :teacherId', { teacherId })
    .getRawOne<{
      teacher_id: number;
      class_id: number;
      session_id: number;
      session_status: SessionStatus;
      discord_guild_id: string;
      attendance_voice_channel_id: string | null;
    }>();

  if (!row) {
    throw new HttpError('session not found or discord guild is not configured for this class', 404);
  }

  if (row.session_status !== SessionStatus.InProgress) {
    throw new HttpError('can only sync voice attendance for an in-progress session', 409);
  }

  if (!botToken) {
    throw new HttpError('system Discord bot token is missing', 400);
  }

  if (!row.attendance_voice_channel_id) {
    throw new HttpError('attendance_voice_channel_id is missing for this class guild', 400);
  }

  return {
    teacher_id: Number(row.teacher_id),
    class_id: Number(row.class_id),
    session_id: Number(row.session_id),
    discord_guild_id: row.discord_guild_id,
    attendance_voice_channel_id: row.attendance_voice_channel_id,
    bot_token: botToken,
  };
}

/**
 * Manually syncs Discord voice attendance for a single in-progress session.
 */
export async function syncVoiceAttendanceForSession(teacherId: number, sessionId: number): Promise<{
  marked_count: number;
}> {
  if (!AppDataSource.isInitialized) {
    return { marked_count: 0 };
  }

  const session = await getVoiceAttendanceSessionForTeacher(teacherId, sessionId);
  const identities = await new DiscordVoice(session.bot_token).listVoiceChannelMembers(
    session.discord_guild_id,
    session.attendance_voice_channel_id,
  );
  const markedCount = await markPresentStudentsForSession(session, identities);

  if (markedCount > 0) {
    console.log(`[voice-attendance] manual sync marked present: ${markedCount} session=${session.session_id}`);
  }

  return { marked_count: markedCount };
}

/**
 * Syncs voice attendance for every currently open voice-attendance session.
 */
export async function syncVoiceAttendanceOnce(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    return;
  }

  const sessions = await getOpenVoiceAttendanceSessions();
  let markedCount = 0;
  for (const session of sessions) {
    markedCount += await syncOpenSession(session);
  }

  if (markedCount > 0) {
    console.log(`[voice-attendance] marked present: ${markedCount}`);
  }
}

/**
 * Lists teachers that currently have open voice-attendance sessions.
 */
export async function listVoiceAttendanceSyncTeacherIds(): Promise<number[]> {
  const sessions = await getOpenVoiceAttendanceSessions();
  return Array.from(new Set(sessions.map((session) => session.teacher_id)));
}

/**
 * Syncs voice attendance for all open sessions of one teacher.
 */
export async function syncVoiceAttendanceForTeacherOnce(teacherId: number): Promise<{
  marked_count: number;
}> {
  if (!AppDataSource.isInitialized) {
    return { marked_count: 0 };
  }

  const sessions = await getOpenVoiceAttendanceSessions(teacherId);
  let markedCount = 0;
  for (const session of sessions) {
    markedCount += await syncOpenSession(session);
  }

  if (markedCount > 0) {
    console.log(`[voice-attendance] marked present: ${markedCount} teacher=${teacherId}`);
  }

  return { marked_count: markedCount };
}

/**
 * Closes persistent Discord voice clients when the worker loop stops.
 */
export function destroyVoiceAttendanceClients(): void {
  DiscordVoice.destroyAll();
}

// ─── ClassroomDiscordWorker ─────────────────────────────────────────────────

/**
 * Orchestrates classroom Discord sync per teacher.
 *
 * The worker combines four independent projections:
 *   - Bot health: validate the default system bot token
 *   - Guild cache: refresh accessible guilds/channels and prune stale bindings
 *   - Membership: move students into the Discord guild for their active class
 *   - Sessions: advance status, create attendance/fees, and mark voice presence
 *
 * Local database state is desired state for classes/enrollments. Discord is the
 * source of truth for guild/channel availability and current voice presence.
 */
export class ClassroomDiscordWorker {
  /**
   * Runs one full classroom Discord sync pass.
   */
  async runOnce(): Promise<void> {
    // Step 1: Validate bot token health once per pass.
    await checkDiscordBotHealthOnce();

    // Step 2: Merge teacher ids from every Discord-related sync concern.
    const teacherIds = Array.from(new Set([
      ...await listDiscordSyncTeacherIds(),
      ...await listStudentDiscordMembershipSyncTeacherIds(),
      ...await listSessionStatusSyncTeacherIds(),
      ...await listVoiceAttendanceSyncTeacherIds(),
    ]));
    let syncedGuilds = 0;
    let removedBindings = 0;
    let sessionsStarted = 0;
    let sessionsCompleted = 0;
    let attendanceCreated = 0;
    let feeRecordsSynced = 0;
    let voiceMarked = 0;
    let membershipAdded = 0;
    let membershipKicked = 0;
    let membershipMoved = 0;
    let membershipSkipped = 0;

    // Step 3: Run teacher-scoped sync tasks and aggregate pass metrics.
    for (const teacherId of teacherIds) {
      const sessionStatusResult = await syncSessionStatusesForTeacherOnce(teacherId);
      sessionsStarted += sessionStatusResult.started;
      sessionsCompleted += sessionStatusResult.completed;
      attendanceCreated += sessionStatusResult.attendance_created;
      feeRecordsSynced += sessionStatusResult.fee_records_synced;

      const discordResult = await syncDiscordGuildsForTeacherOnce(teacherId);
      syncedGuilds += discordResult.synced_guilds;
      removedBindings += discordResult.removed_bindings;

      const membershipResult = await syncStudentDiscordGuildMembershipForTeacherOnce(teacherId);
      membershipAdded += membershipResult.added;
      membershipKicked += membershipResult.kicked;
      membershipMoved += membershipResult.moved;
      membershipSkipped += membershipResult.skipped;

      const voiceResult = await syncVoiceAttendanceForTeacherOnce(teacherId);
      voiceMarked += voiceResult.marked_count;
    }

    if (teacherIds.length > 0) {
      console.log(
        `[sync] classroom-discord teachers=${teacherIds.length}, guilds=${syncedGuilds}, removed_bindings=${removedBindings}, membership_added=${membershipAdded}, membership_kicked=${membershipKicked}, membership_moved=${membershipMoved}, membership_skipped=${membershipSkipped}, sessions_started=${sessionsStarted}, sessions_completed=${sessionsCompleted}, attendance_created=${attendanceCreated}, fee_records_synced=${feeRecordsSynced}, voice_marked=${voiceMarked}`,
      );
    }
  }
}

// ─── Worker Entry Point ──────────────────────────────────────────────────────

export function startClassroomDiscordSyncWorker(): SyncLoop {
  const worker = new ClassroomDiscordWorker();

  return startSyncLoop({
    name: 'classroom-discord',
    getDelayMs: async () => config.sync.intervalSeconds * 1000,
    run: () => worker.runOnce(),
    onStop: destroyVoiceAttendanceClients,
  });
}
