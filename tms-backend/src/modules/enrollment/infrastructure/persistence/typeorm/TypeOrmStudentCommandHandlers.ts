import type { DataSource } from 'typeorm';

import { ArchivePendingStudentUseCase } from '../../../application/commands/ArchivePendingStudentUseCase.js';
import { BulkTransferStudentsUseCase } from '../../../application/commands/BulkTransferStudentsUseCase.js';
import { BulkWithdrawStudentsUseCase } from '../../../application/commands/BulkWithdrawStudentsUseCase.js';
import { CreateStudentUseCase } from '../../../application/commands/CreateStudentUseCase.js';
import { ReinstateStudentUseCase } from '../../../application/commands/ReinstateStudentUseCase.js';
import { TransferStudentUseCase } from '../../../application/commands/TransferStudentUseCase.js';
import { UpdateStudentUseCase } from '../../../application/commands/UpdateStudentUseCase.js';
import { WithdrawStudentUseCase } from '../../../application/commands/WithdrawStudentUseCase.js';
import type { ArchivePendingStudentCommand } from '../../../application/dto/ArchivePendingStudentCommand.js';
import type { BulkTransferStudentsCommand } from '../../../application/dto/BulkTransferStudentsCommand.js';
import type { BulkWithdrawStudentsCommand } from '../../../application/dto/BulkWithdrawStudentsCommand.js';
import type { CreateStudentCommand } from '../../../application/dto/CreateStudentCommand.js';
import type { ReinstateStudentCommand } from '../../../application/dto/ReinstateStudentCommand.js';
import type { TransferStudentCommand } from '../../../application/dto/TransferStudentCommand.js';
import type { UpdateStudentCommand } from '../../../application/dto/UpdateStudentCommand.js';
import type { WithdrawStudentCommand } from '../../../application/dto/WithdrawStudentCommand.js';
import { TypeOrmArchiveFinancePort } from './TypeOrmArchiveFinancePort.js';
import { TypeOrmBalanceSnapshotPort } from './TypeOrmBalanceSnapshotPort.js';
import { TypeOrmClassroomPort } from './TypeOrmClassroomPort.js';
import { TypeOrmEnrollmentRepository } from './TypeOrmEnrollmentRepository.js';
import { TypeOrmStudentRepository } from './TypeOrmStudentRepository.js';
import type { StudentCommunityPort } from '../../../application/ports/StudentCommunityPort.js';

export class TypeOrmStudentCommandHandlers {
  constructor(
    private readonly dataSource: DataSource,
    private readonly studentCommunityPort?: StudentCommunityPort,
  ) {}

  readonly createStudent = {
    execute: (input: CreateStudentCommand) => this.dataSource.transaction(async (manager) => {
      return new CreateStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmClassroomPort(manager),
      ).execute(input);
    }),
  };

  readonly updateStudent = {
    execute: (input: UpdateStudentCommand) => this.dataSource.transaction(async (manager) => {
      return new UpdateStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmBalanceSnapshotPort(manager),
      ).execute(input);
    }),
  };

  readonly transferStudent = {
    execute: (input: TransferStudentCommand) => this.dataSource.transaction(async (manager) => {
      const result = await new TransferStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmClassroomPort(manager),
        new TypeOrmBalanceSnapshotPort(manager),
      ).execute(input);

      void this.studentCommunityPort?.onStudentTransferred(
        input.teacherId,
        input.studentId,
        input.toClassId,
      ).catch(() => {});

      return result;
    }),
  };

  readonly bulkTransferStudents = {
    execute: (input: BulkTransferStudentsCommand) => this.dataSource.transaction(async (manager) => {
      const transferStudent = new TransferStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmClassroomPort(manager),
        new TypeOrmBalanceSnapshotPort(manager),
      );

      return new BulkTransferStudentsUseCase(transferStudent).execute(input);
    }),
  };

  readonly withdrawStudent = {
    execute: (input: WithdrawStudentCommand) => this.dataSource.transaction(async (manager) => {
      const result = await new WithdrawStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmBalanceSnapshotPort(manager),
      ).execute(input);

      void this.studentCommunityPort?.onStudentWithdrawn(
        input.teacherId,
        input.studentId,
      ).catch(() => {});

      return result;
    }),
  };

  readonly bulkWithdrawStudents = {
    execute: (input: BulkWithdrawStudentsCommand) => this.dataSource.transaction(async (manager) => {
      const withdrawStudent = new WithdrawStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmBalanceSnapshotPort(manager),
      );

      return new BulkWithdrawStudentsUseCase(withdrawStudent).execute(input);
    }),
  };

  readonly reinstateStudent = {
    execute: (input: ReinstateStudentCommand) => this.dataSource.transaction(async (manager) => {
      return new ReinstateStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmClassroomPort(manager),
        new TypeOrmBalanceSnapshotPort(manager),
      ).execute(input);
    }),
  };

  readonly archivePendingStudent = {
    execute: (input: ArchivePendingStudentCommand) => this.dataSource.transaction(async (manager) => {
      return new ArchivePendingStudentUseCase(
        new TypeOrmStudentRepository(manager),
        new TypeOrmEnrollmentRepository(manager),
        new TypeOrmBalanceSnapshotPort(manager),
        new TypeOrmArchiveFinancePort(manager),
      ).execute(input);
    }),
  };
}
