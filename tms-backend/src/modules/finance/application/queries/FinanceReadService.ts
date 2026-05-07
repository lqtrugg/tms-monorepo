import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { TransactionReadRepository } from './TransactionReadRepository.js';

export class FinanceReadService {
  constructor(private readonly transactionReadRepository: TransactionReadRepository) {}

  async listTransactions(
    teacherId: number,
    filters: {
      student_id?: number;
      type?: import('../../../../entities/enums.js').TransactionType;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new ServiceError('from must be earlier than or equal to to', 400);
    }

    if (filters.student_id !== undefined) {
      const exists = await this.transactionReadRepository.findOwnedStudent(teacherId, filters.student_id);

      if (!exists) {
        throw new ServiceError('student not found', 404);
      }
    }

    return this.transactionReadRepository.listTransactions(teacherId, filters);
  }

  async listTransactionAuditLogs(teacherId: number, transactionId: number) {
    return this.transactionReadRepository.listTransactionAuditLogs(teacherId, transactionId);
  }

  async listFeeRecords(
    teacherId: number,
    filters: {
      student_id?: number;
      session_id?: number;
      status?: import('../../../../entities/enums.js').FeeRecordStatus;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new ServiceError('from must be earlier than or equal to to', 400);
    }

    if (filters.student_id !== undefined) {
      const exists = await this.transactionReadRepository.findOwnedStudent(teacherId, filters.student_id);

      if (!exists) {
        throw new ServiceError('student not found', 404);
      }
    }

    return this.transactionReadRepository.listFeeRecords(teacherId, filters);
  }

  async listStudentBalances(
    teacherId: number,
    filters: {
      status?: import('../../../../entities/enums.js').StudentStatus;
      include_pending_archive?: boolean;
    },
  ) {
    return this.transactionReadRepository.listStudentBalances(teacherId, filters);
  }

  async getFinanceSummary(
    teacherId: number,
    filters: {
      from?: Date;
      to?: Date;
      class_ids?: number[];
      include_unpaid?: boolean;
    },
  ) {
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new ServiceError('from must be earlier than or equal to to', 400);
    }

    return this.transactionReadRepository.getFinanceSummary(teacherId, filters);
  }
}
