import type { FeeRecordStatus } from '../../../../entities/enums.js';
import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { FeeRecordRepository } from '../../infrastructure/persistence/typeorm/FeeRecordRepository.js';

export class UpdateFeeRecordStatusUseCase {
  constructor(private readonly feeRecordRepository: FeeRecordRepository) {}

  async execute(input: {
    teacherId: number;
    feeRecordId: number;
    status: FeeRecordStatus;
  }) {
    const feeRecord = await this.feeRecordRepository.findOwnedFeeRecord(
      input.teacherId,
      input.feeRecordId,
    );

    if (!feeRecord) {
      throw new ServiceError('fee record not found', 404);
    }

    if (feeRecord.status === input.status) {
      return feeRecord;
    }

    feeRecord.setStatus(input.status);
    return this.feeRecordRepository.save(feeRecord);
  }
}
