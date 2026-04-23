import { In, IsNull } from 'typeorm';

import { AppDataSource } from '../data-source.js';
import {
  Enrollment,
  FeeRecord,
  FeeRecordStatus,
  Student,
  StudentStatus,
  Transaction,
  TransactionType,
} from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';

function parseAmountToBigInt(value: string | null | undefined): bigint {
  if (!value) {
    return 0n;
  }

  return BigInt(value);
}

function toDateRange(from?: Date, to?: Date): { from?: Date; to?: Date } {
  if (from && to && from > to) {
    throw new ServiceError('from must be earlier than or equal to to', 400);
  }

  return { from, to };
}

export async function listTransactions(teacherId: number, filters: {
  student_id?: number;
  type?: TransactionType;
  from?: Date;
  to?: Date;
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

  return queryBuilder.orderBy('transaction.recorded_at', 'DESC').getMany();
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
  if (amount === 0n) {
    throw new ServiceError('amount must be non-zero', 400);
  }

  if (input.type === TransactionType.Payment && amount <= 0n) {
    throw new ServiceError('payment amount must be positive', 400);
  }

  if (input.type === TransactionType.Refund && amount >= 0n) {
    throw new ServiceError('refund amount must be negative', 400);
  }

  const transaction = AppDataSource.getRepository(Transaction).create({
    teacher_id: teacherId,
    student_id: input.student_id,
    amount: amount.toString(),
    type: input.type,
    notes: input.notes ?? null,
    recorded_at: input.recorded_at ?? new Date(),
  });

  return AppDataSource.getRepository(Transaction).save(transaction);
}

export async function listFeeRecords(teacherId: number, filters: {
  student_id?: number;
  session_id?: number;
  status?: FeeRecordStatus;
  from?: Date;
  to?: Date;
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

  return queryBuilder.orderBy('fee_record.created_at', 'DESC').getMany();
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
