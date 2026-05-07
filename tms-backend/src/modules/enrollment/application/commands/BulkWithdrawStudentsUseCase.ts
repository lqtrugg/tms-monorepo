import type { UseCase } from '../../../../shared/application/UseCase.js';
import type { StudentSummary } from '../dto/StudentDto.js';
import type { BulkWithdrawStudentsCommand } from '../dto/BulkWithdrawStudentsCommand.js';
import { WithdrawStudentUseCase } from './WithdrawStudentUseCase.js';

export class BulkWithdrawStudentsUseCase implements UseCase<BulkWithdrawStudentsCommand, StudentSummary[]> {
  constructor(private readonly withdrawStudent: WithdrawStudentUseCase) {}

  async execute(command: BulkWithdrawStudentsCommand): Promise<StudentSummary[]> {
    const studentIds = Array.from(new Set(command.studentIds));
    const result: StudentSummary[] = [];

    for (const studentId of studentIds) {
      result.push(await this.withdrawStudent.execute({
        teacherId: command.teacherId,
        studentId,
        withdrawnAt: command.withdrawnAt,
      }));
    }

    return result;
  }
}
