import type { UseCase } from '../../../../shared/application/UseCase.js';
import { DomainError } from '../../../../shared/domain/DomainError.js';
import type {
  EnrollmentPendingArchiveReason,
  EnrollmentStudentStatus,
} from '../../domain/models/Student.js';
import type { EnrollmentRepository } from '../../infrastructure/persistence/typeorm/EnrollmentRepository.js';
import type { StudentRepository } from '../../infrastructure/persistence/typeorm/StudentRepository.js';
import { CodeforcesHandle } from '../../domain/value-objects/CodeforcesHandle.js';
import { StudentId } from '../../domain/value-objects/StudentId.js';
import type { StudentSummary } from '../dto/StudentDto.js';
import type { BalanceSnapshotPort } from '../ports/BalanceSnapshotPort.js';
import type { UpdateStudentCommand } from '../dto/UpdateStudentCommand.js';

export class UpdateStudentUseCase implements UseCase<UpdateStudentCommand, StudentSummary> {
  constructor(
    private readonly students: StudentRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly balanceSnapshots: BalanceSnapshotPort,
  ) {}

  async execute(command: UpdateStudentCommand): Promise<StudentSummary> {
    const studentId = StudentId.from(command.studentId);
    const student = await this.students.requireById(studentId);

    if (command.fullName !== undefined) {
      student.rename(command.fullName);
    }

    if (command.codeforcesHandle !== undefined) {
      const codeforcesHandle = CodeforcesHandle.fromNullable(command.codeforcesHandle);
      if (
        codeforcesHandle
        && await this.students.codeforcesHandleExists(command.teacherId, codeforcesHandle.value, command.studentId)
      ) {
        throw new DomainError('codeforces_handle_already_exists', 'codeforces_handle already exists');
      }

      student.updateCodeforcesHandle(codeforcesHandle);
    }

    if (command.discordUsername !== undefined) {
      student.updateDiscordUsername(command.discordUsername);
    }

    if (command.phone !== undefined) {
      student.updatePhone(command.phone);
    }

    if (command.note !== undefined) {
      student.updateNote(command.note);
    }

    const savedStudent = await this.students.save(student);
    const activeEnrollment = await this.enrollments.findActiveByStudent(command.teacherId, studentId);
    const snapshot = savedStudent.toSnapshot();
    const balanceSnapshot = await this.balanceSnapshots.loadForStudent(command.teacherId, command.studentId);

    return {
      id: command.studentId,
      teacher_id: snapshot.teacherId,
      full_name: snapshot.fullName,
      codeforces_handle: snapshot.codeforcesHandle,
      discord_username: snapshot.discordUsername,
      phone: snapshot.phone,
      note: snapshot.note,
      status: snapshot.status as EnrollmentStudentStatus,
      pending_archive_reason: snapshot.pendingArchiveReason as EnrollmentPendingArchiveReason | null,
      created_at: snapshot.createdAt ?? new Date(),
      archived_at: snapshot.archivedAt,
      current_class_id: activeEnrollment?.toSnapshot().classId ?? null,
      current_enrollment_id: activeEnrollment?.toSnapshot().id ?? null,
      transactions_total: balanceSnapshot.transactions_total,
      active_fee_total: balanceSnapshot.active_fee_total,
      balance: balanceSnapshot.balance,
    };
  }
}
