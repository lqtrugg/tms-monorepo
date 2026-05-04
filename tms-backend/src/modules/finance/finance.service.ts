import { EntityManager, In, IsNull, QueryFailedError } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Enrollment,
  FeeRecord,
  FeeRecordStatus,
  Student,
  StudentStatus,
  Transaction,
  TransactionAuditLog,
  TransactionType,
} from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  createFeeRecord,
  findActiveFeeRecordsBySessionIds,
  findFeeRecordForAttendance,
  saveFeeRecord,
  saveFeeRecords,
} from './finance.repository.js';

function parseAmountToBigInt(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  return BigInt(value);
}

function isRefundBalanceConstraintError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = error.driverError as { constraint?: string };
  return driverError.constraint === 'chk_transactions_refund_not_over_payment';
}

async function assertRefundDoesNotExceedPayments(
  teacherId: number,
  studentId: number,
  candidate: {
    type: TransactionType;
    amount: bigint;
    exclude_transaction_id?: number;
  },
): Promise<void> {
  const queryBuilder = AppDataSource.getRepository(Transaction)
    .createQueryBuilder('transaction')
    .select("COALESCE(SUM(CASE WHEN transaction.type = 'payment' THEN transaction.amount ELSE 0 END), 0)", 'payments')
    .addSelect("COALESCE(SUM(CASE WHEN transaction.type = 'refund' THEN ABS(transaction.amount) ELSE 0 END), 0)", 'refunds')
    .where('transaction.teacher_id = :teacherId', { teacherId })
    .andWhere('transaction.student_id = :studentId', { studentId });

  if (candidate.exclude_transaction_id !== undefined) {
    queryBuilder.andWhere('transaction.id != :transactionId', {
      transactionId: candidate.exclude_transaction_id,
    });
  }

  const totals = await queryBuilder.getRawOne<{ payments: string; refunds: string }>();

  let totalPayments = parseAmountToBigInt(totals?.payments);
  let totalRefunds = parseAmountToBigInt(totals?.refunds);

  if (candidate.type === TransactionType.Payment) {
    totalPayments += candidate.amount;
  } else {
    totalRefunds += candidate.amount * -1n;
  }

  if (totalRefunds > totalPayments) {
    throw new ServiceError('Tổng số tiền hoàn trả không được lớn hơn tổng số tiền đã nhận', 400);
  }
}

function validateTransactionAmount(type: TransactionType, amount: bigint): void {
  if (amount === 0n) {
    throw new ServiceError('amount must be non-zero', 400);
  }

  if (type === TransactionType.Payment && amount <= 0n) {
    throw new ServiceError('payment amount must be positive', 400);
  }

  if (type === TransactionType.Refund && amount >= 0n) {
    throw new ServiceError('refund amount must be negative', 400);
  }
}

function toDateRange(from?: Date, to?: Date): { from?: Date; to?: Date } {
  if (from && to && from > to) {
    throw new ServiceError('from must be earlier than or equal to to', 400);
  }

  return { from, to };
}

export async function syncAttendanceFeeRecord(
  manager: EntityManager,
  input: {
    teacherId: number;
    sessionId: number;
    studentId: number;
    enrollmentId: number;
    amount: string;
    shouldCharge: boolean;
    cancelledAt?: Date;
  },
): Promise<void> {
  const existing = await findFeeRecordForAttendance(
    manager,
    input.teacherId,
    input.sessionId,
    input.studentId,
  );

  if (!input.shouldCharge) {
    if (existing && !existing.isCancelled()) {
      existing.cancel(input.cancelledAt ?? new Date());
      await saveFeeRecord(manager, existing);
    }

    return;
  }

  if (!existing) {
    const feeRecord = createFeeRecord(manager, {
      teacher_id: input.teacherId,
      student_id: input.studentId,
      session_id: input.sessionId,
      enrollment_id: input.enrollmentId,
      amount: input.amount,
    });

    await saveFeeRecord(manager, feeRecord);
    return;
  }

  existing.activate({
    enrollment_id: input.enrollmentId,
    amount: input.amount,
  });
  await saveFeeRecord(manager, existing);
}

export async function cancelFeeRecordsForSessions(
  manager: EntityManager,
  teacherId: number,
  sessionIds: number[],
  cancelledAt: Date = new Date(),
): Promise<number> {
  const feeRecords = await findActiveFeeRecordsBySessionIds(manager, teacherId, sessionIds);

  if (feeRecords.length === 0) {
    return 0;
  }

  feeRecords.forEach((feeRecord) => {
    feeRecord.cancel(cancelledAt);
  });

  await saveFeeRecords(manager, feeRecords);
  return feeRecords.length;
}

export async function listTransactions(teacherId: number, filters: {
  student_id?: number;
  type?: TransactionType;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  toDateRange(filters.from, filters.to);

  if (filters.student_id !== undefined) {
    const student = await AppDataSource.getRepository(Student).findOneBy({
      id: filters.student_id,
      teacher_id: teacherId,
    });

    if (!student) {
      throw new ServiceError('student not found', 404);
    }
  }

  const queryBuilder = AppDataSource.getRepository(Transaction)
    .createQueryBuilder('transaction')
    .where('transaction.teacher_id = :teacherId', { teacherId });

  if (filters.student_id !== undefined) {
    queryBuilder.andWhere('transaction.student_id = :studentId', {
      studentId: filters.student_id,
    });
  }

  if (filters.type !== undefined) {
    queryBuilder.andWhere('transaction.type = :type', { type: filters.type });
  }

  if (filters.from !== undefined) {
    queryBuilder.andWhere('transaction.recorded_at >= :from', { from: filters.from });
  }

  if (filters.to !== undefined) {
    queryBuilder.andWhere('transaction.recorded_at <= :to', { to: filters.to });
  }

  queryBuilder
    .orderBy('transaction.recorded_at', 'DESC')
    .addOrderBy('transaction.id', 'DESC');

  if (filters.limit !== undefined) {
    queryBuilder.take(filters.limit);
  }

  if (filters.offset !== undefined) {
    queryBuilder.skip(filters.offset);
  }

  const [items, total] = await queryBuilder.getManyAndCount();
  return {
    items,
    total,
    limit: filters.limit ?? null,
    offset: filters.offset ?? 0,
  };
}

export async function createTransaction(teacherId: number, input: {
  student_id: number;
  amount: string;
  type: TransactionType;
  notes?: string | null;
  recorded_at?: Date;
}) {
  const student = await AppDataSource.getRepository(Student).findOneBy({
    id: input.student_id,
    teacher_id: teacherId,
  });

  if (!student) {
    throw new ServiceError('student not found', 404);
  }

  const amount = parseAmountToBigInt(input.amount);
  validateTransactionAmount(input.type, amount);
  await assertRefundDoesNotExceedPayments(teacherId, input.student_id, {
    type: input.type,
    amount,
  });

  const transaction = AppDataSource.getRepository(Transaction).create({
    teacher_id: teacherId,
    student_id: input.student_id,
    amount: amount.toString(),
    type: input.type,
    notes: input.notes ?? null,
    recorded_at: input.recorded_at ?? new Date(),
  });

  try {
    return await AppDataSource.getRepository(Transaction).save(transaction);
  } catch (error) {
    if (isRefundBalanceConstraintError(error)) {
      throw new ServiceError('Tổng số tiền hoàn trả không được lớn hơn tổng số tiền đã nhận', 400);
    }

    throw error;
  }
}

export async function updateTransaction(teacherId: number, transactionId: number, input: {
  student_id: number;
  amount: string;
  type: TransactionType;
  notes?: string | null;
  recorded_at?: Date;
  update_reason?: string | null;
}) {
  const transactionRepository = AppDataSource.getRepository(Transaction);
  const transaction = await transactionRepository.findOneBy({
    id: transactionId,
    teacher_id: teacherId,
  });

  if (!transaction) {
    throw new ServiceError('transaction not found', 404);
  }

  const student = await AppDataSource.getRepository(Student).findOneBy({
    id: input.student_id,
    teacher_id: teacherId,
  });

  if (!student) {
    throw new ServiceError('student not found', 404);
  }

  const amount = parseAmountToBigInt(input.amount);
  validateTransactionAmount(input.type, amount);
  await assertRefundDoesNotExceedPayments(teacherId, input.student_id, {
    type: input.type,
    amount,
    exclude_transaction_id: transactionId,
  });

  const oldSnapshot = {
    student_id: transaction.student_id,
    amount: transaction.amount,
    type: transaction.type,
    notes: transaction.notes,
    recorded_at: transaction.recorded_at,
  };

  const nextRecordedAt = input.recorded_at ?? transaction.recorded_at;

  try {
    return await AppDataSource.transaction(async (manager) => {
      transaction.student_id = input.student_id;
      transaction.amount = amount.toString();
      transaction.type = input.type;
      transaction.notes = input.notes ?? null;
      transaction.recorded_at = nextRecordedAt;

      const saved = await manager.getRepository(Transaction).save(transaction);
      const auditLog = manager.getRepository(TransactionAuditLog).create({
        teacher_id: teacherId,
        transaction_id: transactionId,
        old_student_id: oldSnapshot.student_id,
        new_student_id: saved.student_id,
        old_amount: oldSnapshot.amount,
        new_amount: saved.amount,
        old_type: oldSnapshot.type,
        new_type: saved.type,
        old_recorded_at: oldSnapshot.recorded_at,
        new_recorded_at: saved.recorded_at,
        old_notes: oldSnapshot.notes,
        new_notes: saved.notes,
        reason: input.update_reason ?? null,
      });
      await manager.getRepository(TransactionAuditLog).save(auditLog);

      return saved;
    });
  } catch (error) {
    if (isRefundBalanceConstraintError(error)) {
      throw new ServiceError('Tổng số tiền hoàn trả không được lớn hơn tổng số tiền đã nhận', 400);
    }

    throw error;
  }
}

export async function listFeeRecords(teacherId: number, filters: {
  student_id?: number;
  session_id?: number;
  status?: FeeRecordStatus;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  toDateRange(filters.from, filters.to);

  const queryBuilder = AppDataSource.getRepository(FeeRecord)
    .createQueryBuilder('fee_record')
    .where('fee_record.teacher_id = :teacherId', { teacherId });

  if (filters.student_id !== undefined) {
    queryBuilder.andWhere('fee_record.student_id = :studentId', { studentId: filters.student_id });
  }

  if (filters.session_id !== undefined) {
    queryBuilder.andWhere('fee_record.session_id = :sessionId', { sessionId: filters.session_id });
  }

  if (filters.status !== undefined) {
    queryBuilder.andWhere('fee_record.status = :status', { status: filters.status });
  }

  if (filters.from !== undefined) {
    queryBuilder.andWhere('fee_record.created_at >= :from', { from: filters.from });
  }

  if (filters.to !== undefined) {
    queryBuilder.andWhere('fee_record.created_at <= :to', { to: filters.to });
  }

  queryBuilder
    .orderBy('fee_record.created_at', 'DESC')
    .addOrderBy('fee_record.id', 'DESC');

  if (filters.limit !== undefined) {
    queryBuilder.take(filters.limit);
  }

  if (filters.offset !== undefined) {
    queryBuilder.skip(filters.offset);
  }

  const [items, total] = await queryBuilder.getManyAndCount();
  return {
    items,
    total,
    limit: filters.limit ?? null,
    offset: filters.offset ?? 0,
  };
}

export async function listTransactionAuditLogs(teacherId: number, transactionId: number) {
  const transaction = await AppDataSource.getRepository(Transaction).findOneBy({
    id: transactionId,
    teacher_id: teacherId,
  });

  if (!transaction) {
    throw new ServiceError('transaction not found', 404);
  }

  return AppDataSource.getRepository(TransactionAuditLog).find({
    where: {
      teacher_id: teacherId,
      transaction_id: transactionId,
    },
    order: {
      created_at: 'DESC',
      id: 'DESC',
    },
  });
}

export async function updateFeeRecordStatus(
  teacherId: number,
  feeRecordId: number,
  status: FeeRecordStatus,
) {
  const repo = AppDataSource.getRepository(FeeRecord);
  const feeRecord = await repo.findOneBy({
    id: feeRecordId,
    teacher_id: teacherId,
  });

  if (!feeRecord) {
    throw new ServiceError('fee record not found', 404);
  }

  if (feeRecord.status === status) {
    return feeRecord;
  }

  feeRecord.setStatus(status);

  return repo.save(feeRecord);
}

export async function listStudentBalances(teacherId: number, filters: {
  status?: StudentStatus;
  include_pending_archive?: boolean;
}) {
  const studentQuery = AppDataSource.getRepository(Student)
    .createQueryBuilder('student')
    .where('student.teacher_id = :teacherId', { teacherId });

  if (filters.status !== undefined) {
    studentQuery.andWhere('student.status = :status', { status: filters.status });
  }

  if (filters.include_pending_archive === false) {
    studentQuery.andWhere('student.status != :pendingStatus', { pendingStatus: StudentStatus.PendingArchive });
  }

  const students = await studentQuery
    .orderBy('student.created_at', 'DESC')
    .getMany();

  if (students.length === 0) {
    return [];
  }

  const studentIds = students.map((item) => item.id);

  const transactionTotals = await AppDataSource.getRepository(Transaction)
    .createQueryBuilder('transaction')
    .select('transaction.student_id', 'student_id')
    .addSelect('COALESCE(SUM(transaction.amount), 0)', 'total')
    .where('transaction.teacher_id = :teacherId', { teacherId })
    .andWhere('transaction.student_id IN (:...studentIds)', { studentIds })
    .groupBy('transaction.student_id')
    .getRawMany<{ student_id: string; total: string }>();

  const feeTotals = await AppDataSource.getRepository(FeeRecord)
    .createQueryBuilder('fee_record')
    .select('fee_record.student_id', 'student_id')
    .addSelect('COALESCE(SUM(fee_record.amount), 0)', 'total')
    .where('fee_record.teacher_id = :teacherId', { teacherId })
    .andWhere('fee_record.student_id IN (:...studentIds)', { studentIds })
    .andWhere('fee_record.status = :status', { status: FeeRecordStatus.Active })
    .groupBy('fee_record.student_id')
    .getRawMany<{ student_id: string; total: string }>();

  const transactionMap = new Map(transactionTotals.map((row) => [Number(row.student_id), parseAmountToBigInt(row.total)]));
  const feeMap = new Map(feeTotals.map((row) => [Number(row.student_id), parseAmountToBigInt(row.total)]));

  return students.map((student) => {
    const transactionTotal = transactionMap.get(student.id) ?? 0n;
    const activeFeeTotal = feeMap.get(student.id) ?? 0n;
    const balance = transactionTotal - activeFeeTotal;

    return {
      student_id: student.id,
      full_name: student.full_name,
      status: student.status,
      pending_archive_reason: student.pending_archive_reason,
      transactions_total: transactionTotal.toString(),
      active_fee_total: activeFeeTotal.toString(),
      balance: balance.toString(),
    };
  });
}

export async function getFinanceSummary(teacherId: number, filters: {
  from?: Date;
  to?: Date;
  class_ids?: number[];
  include_unpaid?: boolean;
}) {
  toDateRange(filters.from, filters.to);

  let scopedStudentIds: number[] | null = null;
  if (filters.class_ids && filters.class_ids.length > 0) {
    const enrollments = await AppDataSource.getRepository(Enrollment).find({
      where: {
        teacher_id: teacherId,
        class_id: In(filters.class_ids),
        unenrolled_at: IsNull(),
      },
    });

    scopedStudentIds = Array.from(new Set(enrollments.map((item) => item.student_id)));
  }

  const transactionQuery = AppDataSource.getRepository(Transaction)
    .createQueryBuilder('transaction')
    .where('transaction.teacher_id = :teacherId', { teacherId });

  const feeQuery = AppDataSource.getRepository(FeeRecord)
    .createQueryBuilder('fee_record')
    .where('fee_record.teacher_id = :teacherId', { teacherId });

  if (scopedStudentIds && scopedStudentIds.length > 0) {
    transactionQuery.andWhere('transaction.student_id IN (:...studentIds)', { studentIds: scopedStudentIds });
    feeQuery.andWhere('fee_record.student_id IN (:...studentIds)', { studentIds: scopedStudentIds });
  }

  if (scopedStudentIds && scopedStudentIds.length === 0) {
    return {
      total_payments: '0',
      total_refunds: '0',
      total_active_fees: '0',
      unpaid_total: '0',
      net_revenue: '0',
      projected_revenue: '0',
    };
  }

  if (filters.from) {
    transactionQuery.andWhere('transaction.recorded_at >= :from', { from: filters.from });
    feeQuery.andWhere('fee_record.created_at >= :from', { from: filters.from });
  }

  if (filters.to) {
    transactionQuery.andWhere('transaction.recorded_at <= :to', { to: filters.to });
    feeQuery.andWhere('fee_record.created_at <= :to', { to: filters.to });
  }

  const transactionSums = await transactionQuery
    .select("COALESCE(SUM(CASE WHEN transaction.type = 'payment' THEN transaction.amount ELSE 0 END), 0)", 'payments')
    .addSelect("COALESCE(SUM(CASE WHEN transaction.type = 'refund' THEN ABS(transaction.amount) ELSE 0 END), 0)", 'refunds')
    .getRawOne<{ payments: string; refunds: string }>();

  const feeSums = await feeQuery
    .select('COALESCE(SUM(CASE WHEN fee_record.status = :activeStatus THEN fee_record.amount ELSE 0 END), 0)', 'active_fees')
    .setParameter('activeStatus', FeeRecordStatus.Active)
    .getRawOne<{ active_fees: string }>();

  const balances = await listStudentBalances(teacherId, {
    include_pending_archive: true,
  });
  const scopedStudentIdSet = scopedStudentIds ? new Set(scopedStudentIds) : null;
  const scopedBalances = scopedStudentIdSet
    ? balances.filter((item) => scopedStudentIdSet.has(item.student_id))
    : balances;

  const unpaidTotal = scopedBalances.reduce((sum, item) => {
    const balance = parseAmountToBigInt(item.balance);
    if (balance < 0n) {
      return sum + (balance * -1n);
    }

    return sum;
  }, 0n);

  const totalPayments = parseAmountToBigInt(transactionSums?.payments);
  const totalRefunds = parseAmountToBigInt(transactionSums?.refunds);
  const totalActiveFees = parseAmountToBigInt(feeSums?.active_fees);
  const netRevenue = totalPayments - totalRefunds;
  const projectedRevenue = filters.include_unpaid ? netRevenue + unpaidTotal : netRevenue;

  return {
    total_payments: totalPayments.toString(),
    total_refunds: totalRefunds.toString(),
    total_active_fees: totalActiveFees.toString(),
    unpaid_total: unpaidTotal.toString(),
    net_revenue: netRevenue.toString(),
    projected_revenue: projectedRevenue.toString(),
  };
}
