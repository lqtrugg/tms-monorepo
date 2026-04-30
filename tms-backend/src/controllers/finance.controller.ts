import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { FeeRecordStatus, StudentStatus, Teacher, TeacherRole, TransactionType } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import {
  asRecord,
  parseBoolean,
  parseDateTime,
  parseIntegerArrayFromQuery,
  parseOptionalString,
  parsePositiveInteger,
  parseRequiredString,
} from '../helpers/service.helpers.js';
import {
  createTransaction,
  getFinanceSummary,
  listFeeRecords,
  listTransactionAuditLogs,
  listStudentBalances,
  listTransactions,
  updateFeeRecordStatus,
  updateTransaction,
} from '../services/finance.service.js';
import { requireRoles } from '../services/auth.rbac.js';

export const financeRouter = Router();

financeRouter.use(passport.authenticate('jwt', { session: false }));
financeRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

function parseTransactionType(value: unknown): TransactionType | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== TransactionType.Payment && value !== TransactionType.Refund) {
    throw new ServiceError(`type must be one of: ${TransactionType.Payment}, ${TransactionType.Refund}`, 400);
  }

  return value;
}

function parseStudentStatus(value: unknown): StudentStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value !== StudentStatus.Active
    && value !== StudentStatus.PendingArchive
    && value !== StudentStatus.Archived
  ) {
    throw new ServiceError(
      `status must be one of: ${StudentStatus.Active}, ${StudentStatus.PendingArchive}, ${StudentStatus.Archived}`,
      400,
    );
  }

  return value;
}

function parseFeeRecordStatus(value: unknown): FeeRecordStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== FeeRecordStatus.Active && value !== FeeRecordStatus.Cancelled) {
    throw new ServiceError(`status must be one of: ${FeeRecordStatus.Active}, ${FeeRecordStatus.Cancelled}`, 400);
  }

  return value;
}

function parseOptionalLimit(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const limit = parsePositiveInteger(value, fieldName);
  if (limit > 200) {
    throw new ServiceError(`${fieldName} must be less than or equal to 200`, 400);
  }

  return limit;
}

function parseOptionalOffset(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const offset = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0) {
    throw new ServiceError(`${fieldName} must be a non-negative integer`, 400);
  }

  return offset;
}

financeRouter.get('/finance/transactions', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const result = await listTransactions(teacherId, {
      student_id: query.student_id === undefined ? undefined : parsePositiveInteger(query.student_id, 'student_id'),
      type: parseTransactionType(query.type),
      from: query.from === undefined ? undefined : parseDateTime(query.from, 'from'),
      to: query.to === undefined ? undefined : parseDateTime(query.to, 'to'),
      limit: parseOptionalLimit(query.limit, 'limit'),
      offset: parseOptionalOffset(query.offset, 'offset'),
    });

    res.json({
      transactions: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

financeRouter.post('/finance/transactions', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const body = asRecord(req.body, 'body');
    const type = parseTransactionType(body.type);

    if (!type) {
      throw new ServiceError('type is required', 400);
    }

    const transaction = await createTransaction(teacherId, {
      student_id: parsePositiveInteger(body.student_id, 'student_id'),
      amount: parseRequiredString(body.amount, 'amount'),
      type,
      notes: parseOptionalString(body.notes, 'notes') ?? null,
      recorded_at: body.recorded_at === undefined ? undefined : parseDateTime(body.recorded_at, 'recorded_at'),
    });

    res.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
});

financeRouter.patch('/finance/transactions/:id', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const transactionId = parsePositiveInteger(req.params.id, 'id');
    const body = asRecord(req.body, 'body');
    const type = parseTransactionType(body.type);

    if (!type) {
      throw new ServiceError('type is required', 400);
    }

    const transaction = await updateTransaction(teacherId, transactionId, {
      student_id: parsePositiveInteger(body.student_id, 'student_id'),
      amount: parseRequiredString(body.amount, 'amount'),
      type,
      notes: parseOptionalString(body.notes, 'notes') ?? null,
      recorded_at: body.recorded_at === undefined ? undefined : parseDateTime(body.recorded_at, 'recorded_at'),
      update_reason: parseOptionalString(body.update_reason, 'update_reason') ?? null,
    });

    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

financeRouter.get('/finance/fee-records', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const result = await listFeeRecords(teacherId, {
      student_id: query.student_id === undefined ? undefined : parsePositiveInteger(query.student_id, 'student_id'),
      session_id: query.session_id === undefined ? undefined : parsePositiveInteger(query.session_id, 'session_id'),
      status: parseFeeRecordStatus(query.status),
      from: query.from === undefined ? undefined : parseDateTime(query.from, 'from'),
      to: query.to === undefined ? undefined : parseDateTime(query.to, 'to'),
      limit: parseOptionalLimit(query.limit, 'limit'),
      offset: parseOptionalOffset(query.offset, 'offset'),
    });

    res.json({
      fee_records: result.items,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

financeRouter.get('/finance/transactions/:id/audit-logs', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const transactionId = parsePositiveInteger(req.params.id, 'id');
    const auditLogs = await listTransactionAuditLogs(teacherId, transactionId);

    res.json({ audit_logs: auditLogs });
  } catch (error) {
    next(error);
  }
});

financeRouter.patch('/finance/fee-records/:id/status', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const feeRecordId = parsePositiveInteger(req.params.id, 'id');
    const body = asRecord(req.body, 'body');
    const status = parseFeeRecordStatus(body.status);

    if (!status) {
      throw new ServiceError('status is required', 400);
    }

    const feeRecord = await updateFeeRecordStatus(teacherId, feeRecordId, status);

    res.json({ fee_record: feeRecord });
  } catch (error) {
    next(error);
  }
});

financeRouter.get('/finance/balances', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const balances = await listStudentBalances(teacherId, {
      status: parseStudentStatus(query.status),
      include_pending_archive: query.include_pending_archive === undefined
        ? undefined
        : parseBoolean(query.include_pending_archive, 'include_pending_archive'),
    });

    res.json({ balances });
  } catch (error) {
    next(error);
  }
});

financeRouter.get('/finance/summary', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const summary = await getFinanceSummary(teacherId, {
      from: query.from === undefined ? undefined : parseDateTime(query.from, 'from'),
      to: query.to === undefined ? undefined : parseDateTime(query.to, 'to'),
      class_ids: parseIntegerArrayFromQuery(query.class_ids, 'class_ids'),
      include_unpaid: query.include_unpaid === undefined
        ? undefined
        : parseBoolean(query.include_unpaid, 'include_unpaid'),
    });

    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

financeRouter.use(handleServiceError);
