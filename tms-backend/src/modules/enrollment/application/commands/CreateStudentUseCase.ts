import type { UseCase } from '../../../../shared/application/UseCase.js';
import { DomainError } from '../../../../shared/domain/DomainError.js';
import { Enrollment } from '../../domain/models/Enrollment.js';
import {
  EnrollmentPendingArchiveReason,
  EnrollmentStudentStatus,
  Student,
} from '../../domain/models/Student.js';
import type { EnrollmentRepository } from '../../infrastructure/persistence/typeorm/EnrollmentRepository.js';
import type { StudentRepository } from '../../infrastructure/persistence/typeorm/StudentRepository.js';
import { CodeforcesHandle } from '../../domain/value-objects/CodeforcesHandle.js';
import { StudentId } from '../../domain/value-objects/StudentId.js';
import type { StudentSummary } from '../dto/StudentDto.js';
import type { ClassroomPort } from '../ports/ClassroomPort.js';
import type { CreateStudentCommand } from '../dto/CreateStudentCommand.js';

export class CreateStudentUseCase implements UseCase<CreateStudentCommand, StudentSummary> {
  constructor(
    private readonly students: StudentRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly classroom: ClassroomPort,
  ) {}

  async execute(command: CreateStudentCommand): Promise<StudentSummary> {
    await this.classroom.ensureActiveClass(command.classId);

    const codeforcesHandle = CodeforcesHandle.fromNullable(command.codeforcesHandle);
    if (codeforcesHandle && await this.students.codeforcesHandleExists(codeforcesHandle.value)) {
      throw new DomainError('codeforces_handle_already_exists', 'codeforces_handle already exists');
    }

    const student = Student.create({
      teacherId: command.teacherId,
      fullName: command.fullName,
      codeforcesHandle,
      discordUsername: command.discordUsername,
      phone: command.phone,
      note: command.note,
    });

    const savedStudent = await this.students.save(student);
    const savedStudentId = savedStudent.toSnapshot().id;

    if (savedStudentId === null) {
      throw new DomainError('student_id_missing_after_save');
    }

    const enrollment = Enrollment.create({
      teacherId: command.teacherId,
      studentId: StudentId.from(savedStudentId),
      classId: command.classId,
      enrolledAt: command.enrolledAt,
    });
    const savedEnrollment = await this.enrollments.save(enrollment);

    const savedStudentSnapshot = savedStudent.toSnapshot();
    const savedEnrollmentSnapshot = savedEnrollment.toSnapshot();

    return {
      id: savedStudentId,
      teacher_id: savedStudentSnapshot.teacherId,
      full_name: savedStudentSnapshot.fullName,
      codeforces_handle: savedStudentSnapshot.codeforcesHandle,
      discord_username: savedStudentSnapshot.discordUsername,
      phone: savedStudentSnapshot.phone,
      note: savedStudentSnapshot.note,
      status: savedStudentSnapshot.status as EnrollmentStudentStatus,
      pending_archive_reason: savedStudentSnapshot.pendingArchiveReason as EnrollmentPendingArchiveReason | null,
      created_at: savedStudentSnapshot.createdAt ?? new Date(),
      archived_at: savedStudentSnapshot.archivedAt,
      current_class_id: savedEnrollmentSnapshot.classId,
      current_enrollment_id: savedEnrollmentSnapshot.id,
      transactions_total: '0',
      active_fee_total: '0',
      balance: '0',
    };
  }
}
