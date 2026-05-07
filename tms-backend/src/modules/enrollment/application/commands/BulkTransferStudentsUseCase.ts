import type { UseCase } from '../../../../shared/application/UseCase.js';
import type { StudentSummary } from '../dto/StudentDto.js';
import type { BulkTransferStudentsCommand } from '../dto/BulkTransferStudentsCommand.js';
import { TransferStudentUseCase } from './TransferStudentUseCase.js';

export class BulkTransferStudentsUseCase implements UseCase<BulkTransferStudentsCommand, StudentSummary[]> {
  constructor(private readonly transferStudent: TransferStudentUseCase) {}

  async execute(command: BulkTransferStudentsCommand): Promise<StudentSummary[]> {
    const studentIds = Array.from(new Set(command.studentIds));
    const result: StudentSummary[] = [];

    for (const studentId of studentIds) {
      result.push(await this.transferStudent.execute({
        teacherId: command.teacherId,
        studentId,
        toClassId: command.toClassId,
        transferredAt: command.transferredAt,
      }));
    }

    return result;
  }
}
