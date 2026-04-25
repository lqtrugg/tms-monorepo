import { EntityManager, In, IsNull } from 'typeorm';

import { AppDataSource } from '../data-source.js';
import {
  Class,
  ClassStatus,
  DiscordServer,
  Enrollment,
  FeeRecord,
  FeeRecordStatus,
  PendingArchiveReason,
  Student,
  StudentStatus,
  Transaction,
} from '../entities/index.js';
import { StudentServiceError } from '../errors/student.error.js';
import { toStudentSummary } from '../helpers/student.helpers.js';
import type {
  ArchivePendingStudentInput,
  BulkExpelStudentsInput,
  BulkTransferStudentsInput,
  CreateStudentInput,
  ExpelStudentInput,
  ReinstateStudentInput,
  StudentBalanceSnapshot,
  StudentListFilters,
  StudentSummary,
  TransferStudentInput,
  UpdateStudentInput,
} from '../types/student.types.js';
import {
  createGuildInvite,
  kickGuildMember,
  searchDiscordGuildMembers,
  sendDiscordDirectMessage,
} from './discord-api.service.js';

function parseAmountToBigInt(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  return BigInt(value);
}

function normalizeCodeforcesHandle(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function createZeroBalanceSnapshot(): StudentBalanceSnapshot {
  return {
    transactions_total: '0',
    active_fee_total: '0',
    balance: '0',
  };
}

async function requireOwnedClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  const classEntity = await manager.getRepository(Class).findOneBy({
    id: classId,
    teacher_id: teacherId,
  });

  if (!classEntity) {
    throw new StudentServiceError('class not found', 404);
  }

  return classEntity;
}

async function requireOwnedStudent(manager: EntityManager, teacherId: number, studentId: number): Promise<Student> {
  const student = await manager.getRepository(Student).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });

  if (!student) {
    throw new StudentServiceError('student not found', 404);
  }

  return student;
}

async function requireActiveClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  const classEntity = await requireOwnedClass(manager, teacherId, classId);

  if (classEntity.status !== ClassStatus.Active) {
    throw new StudentServiceError('class is archived', 409);
  }

  return classEntity;
}

async function ensureUniqueCodeforcesHandle(
  manager: EntityManager,
  codeforcesHandle: string | null,
  excludeStudentId?: number,
): Promise<void> {
  const normalizedHandle = normalizeCodeforcesHandle(codeforcesHandle);

  if (!normalizedHandle) {
    return;
  }

  const queryBuilder = manager
    .getRepository(Student)
    .createQueryBuilder('student')
    .where('student.codeforces_handle IS NOT NULL')
    .andWhere('LOWER(student.codeforces_handle) = LOWER(:handle)', {
      handle: normalizedHandle,
    });

  if (excludeStudentId !== undefined) {
    queryBuilder.andWhere('student.id <> :excludeStudentId', { excludeStudentId });
  }

  const duplicated = await queryBuilder.getExists();

  if (duplicated) {
    throw new StudentServiceError('codeforces_handle already exists', 409);
  }
}

async function getActiveEnrollment(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
): Promise<Enrollment | null> {
  return manager.getRepository(Enrollment).findOne({
    where: {
      teacher_id: teacherId,
      student_id: studentId,
      unenrolled_at: IsNull(),
    },
  });
}

async function requireActiveEnrollment(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
): Promise<Enrollment> {
  const enrollment = await getActiveEnrollment(manager, teacherId, studentId);

  if (!enrollment) {
    throw new StudentServiceError('student has no active enrollment', 409);
  }

  return enrollment;
}

async function loadTransactionTotals(
  manager: EntityManager,
  teacherId: number,
  studentIds: number[],
): Promise<Map<number, bigint>> {
  if (studentIds.length === 0) {
    return new Map();
  }

  const rows = await manager
    .getRepository(Transaction)
    .createQueryBuilder('transaction')
    .select('transaction.student_id', 'student_id')
    .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
    .where('transaction.teacher_id = :teacherId', { teacherId })
    .andWhere('transaction.student_id IN (:...studentIds)', { studentIds })
    .groupBy('transaction.student_id')
    .getRawMany<{ student_id: string; total: string }>();

  return new Map(rows.map((row) => [Number(row.student_id), parseAmountToBigInt(row.total)]));
}

async function loadActiveFeeTotals(
  manager: EntityManager,
  teacherId: number,
  studentIds: number[],
): Promise<Map<number, bigint>> {
  if (studentIds.length === 0) {
    return new Map();
  }

  const rows = await manager
    .getRepository(FeeRecord)
    .createQueryBuilder('fee_record')
    .select('fee_record.student_id', 'student_id')
    .addSelect('COALESCE(SUM(fee_record.amount), 0)', 'total')
    .where('fee_record.teacher_id = :teacherId', { teacherId })
    .andWhere('fee_record.student_id IN (:...studentIds)', { studentIds })
    .andWhere('fee_record.status = :status', { status: FeeRecordStatus.Active })
    .groupBy('fee_record.student_id')
    .getRawMany<{ student_id: string; total: string }>();

  return new Map(rows.map((row) => [Number(row.student_id), parseAmountToBigInt(row.total)]));
}

async function loadBalanceSnapshots(
  manager: EntityManager,
  teacherId: number,
  studentIds: number[],
): Promise<Map<number, StudentBalanceSnapshot>> {
  const transactionTotals = await loadTransactionTotals(manager, teacherId, studentIds);
  const activeFeeTotals = await loadActiveFeeTotals(manager, teacherId, studentIds);

  const balanceSnapshots = new Map<number, StudentBalanceSnapshot>();

  studentIds.forEach((studentId) => {
    const transactionsTotal = transactionTotals.get(studentId) ?? 0n;
    const activeFeeTotal = activeFeeTotals.get(studentId) ?? 0n;
    const balance = transactionsTotal - activeFeeTotal;

    balanceSnapshots.set(studentId, {
      transactions_total: transactionsTotal.toString(),
      active_fee_total: activeFeeTotal.toString(),
      balance: balance.toString(),
    });
  });

  return balanceSnapshots;
}

async function loadBalanceSnapshotForStudent(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
): Promise<StudentBalanceSnapshot> {
  const snapshots = await loadBalanceSnapshots(manager, teacherId, [studentId]);
  return snapshots.get(studentId) ?? createZeroBalanceSnapshot();
}

function ensureActiveStudent(student: Student): void {
  if (student.status !== StudentStatus.Active) {
    throw new StudentServiceError('student is not active', 409);
  }
}

function ensurePendingArchiveStudent(student: Student): void {
  if (student.status !== StudentStatus.PendingArchive) {
    throw new StudentServiceError('student is not pending_archive', 409);
  }
}

function ensureArchivedStudent(student: Student): void {
  if (student.status !== StudentStatus.Archived) {
    throw new StudentServiceError('student is not archived', 409);
  }
}

export async function listStudents(teacherId: number, filters: StudentListFilters): Promise<StudentSummary[]> {
  if (filters.class_id !== undefined) {
    await requireOwnedClass(AppDataSource.manager, teacherId, filters.class_id);
  }

  const queryBuilder = AppDataSource.getRepository(Student)
    .createQueryBuilder('student')
    .where('student.teacher_id = :teacherId', { teacherId });

  if (filters.status !== undefined) {
    queryBuilder.andWhere('student.status = :status', { status: filters.status });
  }

  if (filters.pending_archive_reason !== undefined) {
    queryBuilder.andWhere('student.pending_archive_reason = :pendingArchiveReason', {
      pendingArchiveReason: filters.pending_archive_reason,
    });
  }

  if (filters.search !== undefined) {
    queryBuilder.andWhere(
      `(
        student.full_name ILIKE :search
        OR student.codeforces_handle ILIKE :search
        OR student.discord_username ILIKE :search
        OR student.phone ILIKE :search
      )`,
      { search: `%${filters.search}%` },
    );
  }

  if (filters.class_id !== undefined) {
    queryBuilder.innerJoin(
      Enrollment,
      'active_enrollment',
      `
        active_enrollment.teacher_id = student.teacher_id
        AND active_enrollment.student_id = student.id
        AND active_enrollment.unenrolled_at IS NULL
        AND active_enrollment.class_id = :classId
      `,
      { classId: filters.class_id },
    );
  }

  const students = await queryBuilder
    .orderBy('student.created_at', 'DESC')
    .getMany();

  if (students.length === 0) {
    return [];
  }

  const studentIds = students.map((student) => student.id);
  const activeEnrollments = await AppDataSource.getRepository(Enrollment).find({
    where: {
      teacher_id: teacherId,
      student_id: In(studentIds),
      unenrolled_at: IsNull(),
    },
  });

  const activeEnrollmentByStudentId = new Map<number, Enrollment>();
  activeEnrollments.forEach((enrollment) => {
    activeEnrollmentByStudentId.set(enrollment.student_id, enrollment);
  });

  const balanceByStudentId = await loadBalanceSnapshots(AppDataSource.manager, teacherId, studentIds);

  return students.map((student) => {
    const activeEnrollment = activeEnrollmentByStudentId.get(student.id) ?? null;
    const balanceSnapshot = balanceByStudentId.get(student.id) ?? createZeroBalanceSnapshot();

    return toStudentSummary(student, {
      current_class_id: activeEnrollment?.class_id ?? null,
      current_enrollment_id: activeEnrollment?.id ?? null,
      balance_snapshot: balanceSnapshot,
    });
  });
}

export async function getStudentById(teacherId: number, studentId: number): Promise<StudentSummary> {
  const student = await requireOwnedStudent(AppDataSource.manager, teacherId, studentId);
  const activeEnrollment = await getActiveEnrollment(AppDataSource.manager, teacherId, studentId);
  const balanceSnapshot = await loadBalanceSnapshotForStudent(AppDataSource.manager, teacherId, studentId);

  return toStudentSummary(student, {
    current_class_id: activeEnrollment?.class_id ?? null,
    current_enrollment_id: activeEnrollment?.id ?? null,
    balance_snapshot: balanceSnapshot,
  });
}

export async function createStudent(teacherId: number, input: CreateStudentInput): Promise<StudentSummary> {
  return AppDataSource.transaction(async (manager) => {
    await requireActiveClass(manager, teacherId, input.class_id);
    const normalizedCodeforcesHandle = normalizeCodeforcesHandle(input.codeforces_handle);
    await ensureUniqueCodeforcesHandle(manager, normalizedCodeforcesHandle);

    const studentRepo = manager.getRepository(Student);
    const enrollmentRepo = manager.getRepository(Enrollment);

    const student = studentRepo.create({
      teacher_id: teacherId,
      full_name: input.full_name,
      codeforces_handle: normalizedCodeforcesHandle,
      discord_username: input.discord_username.trim(),
      phone: input.phone,
      note: input.note,
      status: StudentStatus.Active,
      pending_archive_reason: null,
      archived_at: null,
    });

    const savedStudent = await studentRepo.save(student);

    const enrollment = enrollmentRepo.create({
      teacher_id: teacherId,
      student_id: savedStudent.id,
      class_id: input.class_id,
      enrolled_at: input.enrolled_at,
      unenrolled_at: null,
    });

    const savedEnrollment = await enrollmentRepo.save(enrollment);

    return toStudentSummary(savedStudent, {
      current_class_id: savedEnrollment.class_id,
      current_enrollment_id: savedEnrollment.id,
      balance_snapshot: createZeroBalanceSnapshot(),
    });
  });
}

export async function updateStudent(
  teacherId: number,
  studentId: number,
  input: UpdateStudentInput,
): Promise<StudentSummary> {
  return AppDataSource.transaction(async (manager) => {
    const studentRepo = manager.getRepository(Student);
    const student = await requireOwnedStudent(manager, teacherId, studentId);

    if (input.full_name !== undefined) {
      student.full_name = input.full_name;
    }

    if (input.codeforces_handle !== undefined) {
      const normalizedCodeforcesHandle = normalizeCodeforcesHandle(input.codeforces_handle);
      await ensureUniqueCodeforcesHandle(manager, normalizedCodeforcesHandle, student.id);
      student.codeforces_handle = normalizedCodeforcesHandle;
    }

    if (input.discord_username !== undefined) {
      student.discord_username = input.discord_username;
    }

    if (input.phone !== undefined) {
      student.phone = input.phone;
    }

    if (input.note !== undefined) {
      student.note = input.note;
    }

    const savedStudent = await studentRepo.save(student);
    const activeEnrollment = await getActiveEnrollment(manager, teacherId, studentId);
    const balanceSnapshot = await loadBalanceSnapshotForStudent(manager, teacherId, studentId);

    return toStudentSummary(savedStudent, {
      current_class_id: activeEnrollment?.class_id ?? null,
      current_enrollment_id: activeEnrollment?.id ?? null,
      balance_snapshot: balanceSnapshot,
    });
  });
}

async function transferStudentInManager(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
  input: TransferStudentInput,
): Promise<StudentSummary> {
  const studentRepo = manager.getRepository(Student);
  const enrollmentRepo = manager.getRepository(Enrollment);

  const student = await requireOwnedStudent(manager, teacherId, studentId);
  ensureActiveStudent(student);

  await requireActiveClass(manager, teacherId, input.to_class_id);
  const activeEnrollment = await requireActiveEnrollment(manager, teacherId, studentId);

  if (activeEnrollment.class_id === input.to_class_id) {
    throw new StudentServiceError('student is already enrolled in this class', 409);
  }

  if (input.transferred_at <= activeEnrollment.enrolled_at) {
    throw new StudentServiceError('transferred_at must be later than current enrollment start time', 400);
  }

  activeEnrollment.unenrolled_at = input.transferred_at;
  await enrollmentRepo.save(activeEnrollment);

  const nextEnrollment = enrollmentRepo.create({
    teacher_id: teacherId,
    student_id: student.id,
    class_id: input.to_class_id,
    enrolled_at: input.transferred_at,
    unenrolled_at: null,
  });
  const savedNextEnrollment = await enrollmentRepo.save(nextEnrollment);

  const balanceSnapshot = await loadBalanceSnapshotForStudent(manager, teacherId, student.id);
  const savedStudent = await studentRepo.save(student);

  return toStudentSummary(savedStudent, {
    current_class_id: savedNextEnrollment.class_id,
    current_enrollment_id: savedNextEnrollment.id,
    balance_snapshot: balanceSnapshot,
  });
}

export async function transferStudent(
  teacherId: number,
  studentId: number,
  input: TransferStudentInput,
): Promise<StudentSummary> {
  const result = await AppDataSource.transaction((manager) => transferStudentInManager(manager, teacherId, studentId, input));

  // Fire-and-forget Discord kick from old class + invite to new class
  void handleDiscordTransfer(teacherId, studentId, input.to_class_id).catch(() => {});

  return result;
}

export async function bulkTransferStudents(
  teacherId: number,
  input: BulkTransferStudentsInput,
): Promise<StudentSummary[]> {
  return AppDataSource.transaction(async (manager) => {
    const studentIds = Array.from(new Set(input.student_ids));
    const result: StudentSummary[] = [];

    for (const studentId of studentIds) {
      const student = await transferStudentInManager(manager, teacherId, studentId, {
        to_class_id: input.to_class_id,
        transferred_at: input.transferred_at,
      });
      result.push(student);
    }

    return result;
  });
}

async function expelStudentInManager(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
  input: ExpelStudentInput,
): Promise<StudentSummary> {
  const studentRepo = manager.getRepository(Student);
  const enrollmentRepo = manager.getRepository(Enrollment);

  const student = await requireOwnedStudent(manager, teacherId, studentId);
  ensureActiveStudent(student);

  const activeEnrollment = await getActiveEnrollment(manager, teacherId, studentId);
  if (activeEnrollment && input.expelled_at <= activeEnrollment.enrolled_at) {
    throw new StudentServiceError('expelled_at must be later than current enrollment start time', 400);
  }

  const balanceSnapshot = await loadBalanceSnapshotForStudent(manager, teacherId, student.id);
  const balanceAmount = parseAmountToBigInt(balanceSnapshot.balance);

  if (activeEnrollment) {
    activeEnrollment.unenrolled_at = input.expelled_at;
    await enrollmentRepo.save(activeEnrollment);
  }

  if (balanceAmount < 0n) {
    student.status = StudentStatus.PendingArchive;
    student.pending_archive_reason = PendingArchiveReason.NeedsCollection;
    student.archived_at = null;
  } else if (balanceAmount > 0n) {
    student.status = StudentStatus.PendingArchive;
    student.pending_archive_reason = PendingArchiveReason.NeedsRefund;
    student.archived_at = null;
  } else {
    student.status = StudentStatus.Archived;
    student.pending_archive_reason = null;
    student.archived_at = input.expelled_at;
  }

  const savedStudent = await studentRepo.save(student);

  return toStudentSummary(savedStudent, {
    current_class_id: null,
    current_enrollment_id: null,
    balance_snapshot: balanceSnapshot,
  });
}

export async function expelStudent(
  teacherId: number,
  studentId: number,
  input: ExpelStudentInput,
): Promise<StudentSummary> {
  const result = await AppDataSource.transaction((manager) => expelStudentInManager(manager, teacherId, studentId, input));

  // Fire-and-forget Discord kick from current class
  void handleDiscordKick(teacherId, studentId).catch(() => {});

  return result;
}

export async function bulkExpelStudents(
  teacherId: number,
  input: BulkExpelStudentsInput,
): Promise<StudentSummary[]> {
  return AppDataSource.transaction(async (manager) => {
    const studentIds = Array.from(new Set(input.student_ids));
    const result: StudentSummary[] = [];

    for (const studentId of studentIds) {
      const student = await expelStudentInManager(manager, teacherId, studentId, {
        expelled_at: input.expelled_at,
      });
      result.push(student);
    }

    return result;
  });
}

export async function reinstateStudent(
  teacherId: number,
  studentId: number,
  input: ReinstateStudentInput,
): Promise<StudentSummary> {
  return AppDataSource.transaction(async (manager) => {
    const studentRepo = manager.getRepository(Student);
    const enrollmentRepo = manager.getRepository(Enrollment);

    const student = await requireOwnedStudent(manager, teacherId, studentId);
    ensureArchivedStudent(student);
    await requireActiveClass(manager, teacherId, input.class_id);

    const activeEnrollment = await getActiveEnrollment(manager, teacherId, student.id);
    if (activeEnrollment) {
      throw new StudentServiceError('student already has an active enrollment', 409);
    }

    if (student.archived_at && input.enrolled_at <= student.archived_at) {
      throw new StudentServiceError('enrolled_at must be later than archived_at', 400);
    }

    await ensureUniqueCodeforcesHandle(manager, student.codeforces_handle, student.id);

    const balanceSnapshot = await loadBalanceSnapshotForStudent(manager, teacherId, student.id);

    student.status = StudentStatus.Active;
    student.pending_archive_reason = null;
    student.archived_at = null;
    const savedStudent = await studentRepo.save(student);

    const enrollment = enrollmentRepo.create({
      teacher_id: teacherId,
      student_id: student.id,
      class_id: input.class_id,
      enrolled_at: input.enrolled_at,
      unenrolled_at: null,
    });
    const savedEnrollment = await enrollmentRepo.save(enrollment);

    return toStudentSummary(savedStudent, {
      current_class_id: savedEnrollment.class_id,
      current_enrollment_id: savedEnrollment.id,
      balance_snapshot: balanceSnapshot,
    });
  });
}

export async function archivePendingStudent(
  teacherId: number,
  studentId: number,
  input: ArchivePendingStudentInput,
): Promise<StudentSummary> {
  return AppDataSource.transaction(async (manager) => {
    const studentRepo = manager.getRepository(Student);
    const enrollmentRepo = manager.getRepository(Enrollment);

    const student = await requireOwnedStudent(manager, teacherId, studentId);
    ensurePendingArchiveStudent(student);

    const balanceSnapshot = await loadBalanceSnapshotForStudent(manager, teacherId, student.id);
    const balanceAmount = parseAmountToBigInt(balanceSnapshot.balance);

    if (balanceAmount !== 0n) {
      throw new StudentServiceError('student balance must be zero before archive', 409);
    }

    const activeEnrollment = await getActiveEnrollment(manager, teacherId, student.id);
    if (activeEnrollment) {
      if (input.archived_at <= activeEnrollment.enrolled_at) {
        throw new StudentServiceError('archived_at must be later than current enrollment start time', 400);
      }

      activeEnrollment.unenrolled_at = input.archived_at;
      await enrollmentRepo.save(activeEnrollment);
    }

    student.status = StudentStatus.Archived;
    student.pending_archive_reason = null;
    student.archived_at = input.archived_at;

    const savedStudent = await studentRepo.save(student);

    return toStudentSummary(savedStudent, {
      current_class_id: null,
      current_enrollment_id: null,
      balance_snapshot: balanceSnapshot,
    });
  });
}

// ── Discord automation helpers ──

async function resolveDiscordUserId(
  server: DiscordServer,
  discordUsername: string,
): Promise<string | null> {
  if (!server.bot_token || !discordUsername) {
    return null;
  }

  const query = discordUsername.trim().replace(/^@/, '');
  try {
    const members = await searchDiscordGuildMembers({
      guildId: server.discord_server_id,
      query,
      botToken: server.bot_token,
      limit: 10,
    });

    const normalized = query.toLowerCase();
    const match = members.find(
      (m) =>
        m.username?.toLowerCase() === normalized
        || m.global_name?.toLowerCase() === normalized
        || m.nick?.toLowerCase() === normalized,
    );
    return match?.user_id ?? (members.length === 1 ? members[0].user_id : null);
  } catch {
    return null;
  }
}

async function handleDiscordKick(teacherId: number, studentId: number): Promise<void> {
  const student = await AppDataSource.getRepository(Student).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
  if (!student?.discord_username) {
    return;
  }

  // Find the most recently unenrolled enrollment to determine old class
  const lastEnrollment = await AppDataSource.getRepository(Enrollment).findOne({
    where: { teacher_id: teacherId, student_id: studentId },
    order: { id: 'DESC' },
  });
  if (!lastEnrollment) {
    return;
  }

  const server = await AppDataSource.getRepository(DiscordServer).findOneBy({
    teacher_id: teacherId,
    class_id: lastEnrollment.class_id,
  });
  if (!server?.bot_token) {
    return;
  }

  const userId = await resolveDiscordUserId(server, student.discord_username);
  if (!userId) {
    return;
  }

  await kickGuildMember({
    guildId: server.discord_server_id,
    userId,
    botToken: server.bot_token,
  });
}

async function handleDiscordTransfer(
  teacherId: number,
  studentId: number,
  newClassId: number,
): Promise<void> {
  const student = await AppDataSource.getRepository(Student).findOneBy({
    id: studentId,
    teacher_id: teacherId,
  });
  if (!student?.discord_username) {
    return;
  }

  // Kick from old class (second-to-last enrollment)
  const enrollments = await AppDataSource.getRepository(Enrollment).find({
    where: { teacher_id: teacherId, student_id: studentId },
    order: { id: 'DESC' },
    take: 2,
  });

  const oldEnrollment = enrollments.length >= 2 ? enrollments[1] : null;
  if (oldEnrollment) {
    const oldServer = await AppDataSource.getRepository(DiscordServer).findOneBy({
      teacher_id: teacherId,
      class_id: oldEnrollment.class_id,
    });
    if (oldServer?.bot_token) {
      const userId = await resolveDiscordUserId(oldServer, student.discord_username);
      if (userId) {
        try {
          await kickGuildMember({
            guildId: oldServer.discord_server_id,
            userId,
            botToken: oldServer.bot_token,
          });
        } catch {
          // Kick failure is non-critical
        }
      }
    }
  }

  // Invite to new class Discord
  const newServer = await AppDataSource.getRepository(DiscordServer).findOneBy({
    teacher_id: teacherId,
    class_id: newClassId,
  });
  if (!newServer?.bot_token) {
    return;
  }

  // Use notification channel or attendance channel to create invite
  const channelId = newServer.notification_channel_id ?? newServer.attendance_voice_channel_id;
  if (!channelId) {
    return;
  }

  try {
    const invite = await createGuildInvite({
      channelId,
      botToken: newServer.bot_token,
      maxAge: 86400 * 7,
      maxUses: 1,
    });

    // DM the invite link to the student
    await sendDiscordDirectMessage({
      botToken: newServer.bot_token,
      recipientUserId: (await resolveDiscordUserId(newServer, student.discord_username)) ?? '',
      content: `Bạn đã được chuyển lớp. Vui lòng tham gia server Discord mới: ${invite.url}`,
    });
  } catch {
    // Invite/DM failure is non-critical
  }
}

