import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import {
  Class,
  ClassStatus,
  DiscordServer,
  Enrollment,
  PendingArchiveReason,
  Student,
  StudentStatus,
  Transaction,
  TransactionType,
} from '../../../entities/index.js';
import { StudentServiceError } from '../../../shared/errors/student.error.js';
import { toStudentSummary } from './student.mapper.js';
import {
  codeforcesHandleExists,
  createZeroBalanceSnapshot,
  findActiveEnrollment,
  findActiveEnrollmentsByStudentIds,
  findDiscordServerByClass,
  findLastEnrollment,
  findOwnedClass,
  findOwnedStudent,
  findRecentEnrollments,
  listStudentsForTeacher,
  loadBalanceSnapshotForStudent,
  loadBalanceSnapshots,
} from './student.repository.js';
import type {
  ArchivePendingStudentInput,
  BulkWithdrawStudentsInput,
  BulkTransferStudentsInput,
  CreateStudentInput,
  WithdrawStudentInput,
  ReinstateStudentInput,
  StudentListFilters,
  StudentSummary,
  TransferStudentInput,
  UpdateStudentInput,
} from './student.types.js';
import {
  createGuildInvite,
  kickGuildMember,
  searchDiscordGuildMembers,
  sendDiscordDirectMessage,
} from '../../../integrations/discord/discord-api.service.js';

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

async function requireOwnedClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  const classEntity = await findOwnedClass(manager, teacherId, classId);

  if (!classEntity) {
    throw new StudentServiceError('class not found', 404);
  }

  return classEntity;
}

async function requireOwnedStudent(manager: EntityManager, teacherId: number, studentId: number): Promise<Student> {
  const student = await findOwnedStudent(manager, teacherId, studentId);

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

  const duplicated = await codeforcesHandleExists(manager, normalizedHandle, excludeStudentId);

  if (duplicated) {
    throw new StudentServiceError('codeforces_handle already exists', 409);
  }
}

async function requireActiveEnrollment(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
): Promise<Enrollment> {
  const enrollment = await findActiveEnrollment(manager, teacherId, studentId);

  if (!enrollment) {
    throw new StudentServiceError('student has no active enrollment', 409);
  }

  return enrollment;
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

  const students = await listStudentsForTeacher(AppDataSource.manager, teacherId, filters);

  if (students.length === 0) {
    return [];
  }

  const studentIds = students.map((student) => student.id);
  const activeEnrollments = await findActiveEnrollmentsByStudentIds(AppDataSource.manager, teacherId, studentIds);

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
  const activeEnrollment = await findActiveEnrollment(AppDataSource.manager, teacherId, studentId);
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
    const activeEnrollment = await findActiveEnrollment(manager, teacherId, studentId);
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

async function withdrawStudentInManager(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
  input: WithdrawStudentInput,
): Promise<StudentSummary> {
  const studentRepo = manager.getRepository(Student);
  const enrollmentRepo = manager.getRepository(Enrollment);

  const student = await requireOwnedStudent(manager, teacherId, studentId);
  ensureActiveStudent(student);

  const activeEnrollment = await findActiveEnrollment(manager, teacherId, studentId);
  if (activeEnrollment && input.withdrawn_at <= activeEnrollment.enrolled_at) {
    throw new StudentServiceError('withdrawn_at must be later than current enrollment start time', 400);
  }

  const balanceSnapshot = await loadBalanceSnapshotForStudent(manager, teacherId, student.id);
  const balanceAmount = parseAmountToBigInt(balanceSnapshot.balance);

  if (activeEnrollment) {
    activeEnrollment.unenrolled_at = input.withdrawn_at;
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
    student.archived_at = input.withdrawn_at;
  }

  const savedStudent = await studentRepo.save(student);

  return toStudentSummary(savedStudent, {
    current_class_id: null,
    current_enrollment_id: null,
    balance_snapshot: balanceSnapshot,
  });
}

export async function withdrawStudent(
  teacherId: number,
  studentId: number,
  input: WithdrawStudentInput,
): Promise<StudentSummary> {
  const result = await AppDataSource.transaction((manager) => withdrawStudentInManager(manager, teacherId, studentId, input));

  // Fire-and-forget Discord kick from current class
  void handleDiscordKick(teacherId, studentId).catch(() => {});

  return result;
}

export async function bulkWithdrawStudents(
  teacherId: number,
  input: BulkWithdrawStudentsInput,
): Promise<StudentSummary[]> {
  return AppDataSource.transaction(async (manager) => {
    const studentIds = Array.from(new Set(input.student_ids));
    const result: StudentSummary[] = [];

    for (const studentId of studentIds) {
      const student = await withdrawStudentInManager(manager, teacherId, studentId, {
        withdrawn_at: input.withdrawn_at,
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

    const activeEnrollment = await findActiveEnrollment(manager, teacherId, student.id);
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
    let balanceAmount = parseAmountToBigInt(balanceSnapshot.balance);

    if (balanceAmount !== 0n && input.settle_finance) {
      const transactionRepo = manager.getRepository(Transaction);
      const isCollectingDebt = balanceAmount < 0n;
      const transaction = transactionRepo.create({
        teacher_id: teacherId,
        student_id: student.id,
        amount: isCollectingDebt ? (balanceAmount * -1n).toString() : (balanceAmount * -1n).toString(),
        type: isCollectingDebt ? TransactionType.Payment : TransactionType.Refund,
        notes: isCollectingDebt ? 'Tự động ghi nhận khi đã thu nợ và archive học sinh' : 'Tự động ghi nhận khi đã hoàn trả và archive học sinh',
        recorded_at: input.archived_at,
      });
      await transactionRepo.save(transaction);
      balanceAmount = 0n;
      balanceSnapshot.transactions_total = (parseAmountToBigInt(balanceSnapshot.transactions_total) + parseAmountToBigInt(transaction.amount)).toString();
      balanceSnapshot.balance = '0';
    }

    if (balanceAmount !== 0n) {
      throw new StudentServiceError('student balance must be zero before archive', 409);
    }

    const activeEnrollment = await findActiveEnrollment(manager, teacherId, student.id);
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
  const student = await findOwnedStudent(AppDataSource.manager, teacherId, studentId);
  if (!student?.discord_username) {
    return;
  }

  // Find the most recently unenrolled enrollment to determine old class
  const lastEnrollment = await findLastEnrollment(AppDataSource.manager, teacherId, studentId);
  if (!lastEnrollment) {
    return;
  }

  const server = await findDiscordServerByClass(AppDataSource.manager, teacherId, lastEnrollment.class_id);
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
  const student = await findOwnedStudent(AppDataSource.manager, teacherId, studentId);
  if (!student?.discord_username) {
    return;
  }

  // Kick from old class (second-to-last enrollment)
  const enrollments = await findRecentEnrollments(AppDataSource.manager, teacherId, studentId, 2);

  const oldEnrollment = enrollments.length >= 2 ? enrollments[1] : null;
  if (oldEnrollment) {
    const oldServer = await findDiscordServerByClass(AppDataSource.manager, teacherId, oldEnrollment.class_id);
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
  const newServer = await findDiscordServerByClass(AppDataSource.manager, teacherId, newClassId);
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
