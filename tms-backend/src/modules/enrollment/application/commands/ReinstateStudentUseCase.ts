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
import type { ReinstateStudentCommand } from '../dto/ReinstateStudentCommand.js';

export class ReinstateStudentUseCase implements UseCase<ReinstateStudentCommand, StudentSummary> {
  constructor(
    private readonly students: StudentRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly classroom: ClassroomPort,
    private readonly balanceSnapshots: BalanceSnapshotPort,
  ) {}

  async execute(command: ReinstateStudentCommand): Promise<StudentSummary> {
    const studentId = StudentId.from(command.studentId);
    const student = await this.students.requireById(studentId);
    student.assertArchived();

    await this.classroom.ensureActiveClass(command.classId);

    const activeEnrollment = await this.enrollments.findActiveByStudent(command.teacherId, studentId);
    if (activeEnrollment) {
      throw new DomainError('student_already_has_active_enrollment', 'student already has an active enrollment');
    }

    const codeforcesHandle = student.toSnapshot().codeforcesHandle;
    if (codeforcesHandle && await this.students.codeforcesHandleExists(codeforcesHandle, command.studentId)) {
      throw new DomainError('codeforces_handle_already_exists', 'codeforces_handle already exists');
    }

    student.assertReinstatableAt(command.enrolledAt);
    student.reinstate();
    const savedStudent = await this.students.save(student);
    savedStudent.recordReinstated(command.classId, command.enrolledAt);

    const enrollment = Enrollment.create({
      teacherId: command.teacherId,
      studentId,
      classId: command.classId,
      enrolledAt: command.enrolledAt,
    });
    const savedEnrollment = await this.enrollments.save(enrollment);
    const snapshot = savedStudent.toSnapshot();
    const enrollmentSnapshot = savedEnrollment.toSnapshot();
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
