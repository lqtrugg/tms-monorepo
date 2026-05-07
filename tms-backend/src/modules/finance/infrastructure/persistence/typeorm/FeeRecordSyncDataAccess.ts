import { In, type EntityManager } from 'typeorm';

import { FeeRecordStatus } from '../../../../../entities/enums.js';
import { FeeRecordOrmEntity } from './FeeRecordOrmEntity.js';

export function findFeeRecordForAttendance(
  manager: EntityManager,
  teacherId: number,
  sessionId: number,
  studentId: number,
): Promise<FeeRecordOrmEntity | null> {
  return manager.getRepository(FeeRecordOrmEntity).findOneBy({
    teacher_id: teacherId,
    session_id: sessionId,
    student_id: studentId,
  });
}

export function createFeeRecord(
  manager: EntityManager,
  input: {
    teacher_id: number;
    student_id: number;
    session_id: number;
    enrollment_id: number;
    amount: string;
  },
): FeeRecordOrmEntity {
  const feeRecord = manager.getRepository(FeeRecordOrmEntity).create({
    teacher_id: input.teacher_id,
    student_id: input.student_id,
    session_id: input.session_id,
  });
  feeRecord.activate({
    enrollment_id: input.enrollment_id,
    amount: input.amount,
  });

  return feeRecord;
}

export function saveFeeRecord(
  manager: EntityManager,
  feeRecord: FeeRecordOrmEntity,
): Promise<FeeRecordOrmEntity> {
  return manager.getRepository(FeeRecordOrmEntity).save(feeRecord);
}

export function findActiveFeeRecordsBySessionIds(
  manager: EntityManager,
  teacherId: number,
  sessionIds: number[],
): Promise<FeeRecordOrmEntity[]> {
  if (sessionIds.length === 0) {
    return Promise.resolve([]);
  }

  return manager.getRepository(FeeRecordOrmEntity).find({
    where: {
      teacher_id: teacherId,
      session_id: In(sessionIds),
      status: FeeRecordStatus.Active,
    },
  });
}

export function saveFeeRecords(
  manager: EntityManager,
  feeRecords: FeeRecordOrmEntity[],
): Promise<FeeRecordOrmEntity[]> {
  return manager.getRepository(FeeRecordOrmEntity).save(feeRecords);
}
