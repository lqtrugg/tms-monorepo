import type { UseCase } from '../../../../shared/application/UseCase.js';
import { DomainError } from '../../../../shared/domain/DomainError.js';
import { Enrollment } from '../../domain/models/Enrollment.js';
import type {
  EnrollmentPendingArchiveReason,
  EnrollmentStudentStatus,
} from '../../domain/models/Student.js';
import type { EnrollmentRepository } from '../../infrastructure/persistence/typeorm/EnrollmentRepository.js';
import type { StudentRepository } from '../../infrastructure/persistence/typeorm/StudentRepository.js';
import { StudentId } from '../../domain/value-objects/StudentId.js';
import type { StudentSummary } from '../dto/StudentDto.js';
import type { BalanceSnapshotPort } from '../ports/BalanceSnapshotPort.js';
import type { ClassroomPort } from '../ports/ClassroomPort.js';
import type { TransferStudentCommand } from '../dto/TransferStudentCommand.js';

export class TransferStudentUseCase implements UseCase<TransferStudentCommand, StudentSummary> {
  constructor(
    private readonly students: StudentRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly classroom: ClassroomPort,
    private readonly balanceSnapshots: BalanceSnapshotPort,
  ) {}

  async execute(command: TransferStudentCommand): Promise<StudentSummary> {
    const studentId = StudentId.from(command.studentId);
    const student = await this.students.requireById(studentId);
    student.assertActive();

    await this.classroom.ensureActiveClass(command.toClassId);

    const activeEnrollment = await this.enrollments.findActiveByStudent(command.teacherId, studentId);
    if (!activeEnrollment) {
      throw new DomainError('student_has_no_active_enrollment', 'student has no active enrollment');
    }

    activeEnrollment.assertTransferableTo(command.toClassId, command.transferredAt);
    activeEnrollment.endAt(command.transferredAt);
    await this.enrollments.save(activeEnrollment);

    const nextEnrollment = Enrollment.create({
      teacherId: command.teacherId,
      studentId,
      classId: command.toClassId,
      enrolledAt: command.transferredAt,
    });
    const savedNextEnrollment = await this.enrollments.save(nextEnrollment);
    student.recordTransferred(command.toClassId, command.transferredAt);

    const snapshot = student.toSnapshot();
    const enrollmentSnapshot = savedNextEnrollment.toSnapshot();
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
      current_class_id: enrollmentSnapshot.classId,
      current_enrollment_id: enrollmentSnapshot.id,
      transactions_total: balanceSnapshot.transactions_total,
      active_fee_total: balanceSnapshot.active_fee_total,
      balance: balanceSnapshot.balance,
    };
  }
}
