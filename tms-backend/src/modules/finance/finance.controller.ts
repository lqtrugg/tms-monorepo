import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import {
  financeFeeRecordListQuerySchema,
  financeSummaryQuerySchema,
  financeTransactionBodySchema,
  financeTransactionListQuerySchema,
  idParamSchema,
  studentBalancesQuerySchema,
  updateFeeRecordStatusBodySchema,
  updateFinanceTransactionBodySchema,
  type FinanceFeeRecordListQuery,
  type FinanceSummaryQuery,
  type FinanceTransactionBody,
  type FinanceTransactionListQuery,
  type IdParam,
  type StudentBalancesQuery,
  type UpdateFeeRecordStatusBody,
  type UpdateFinanceTransactionBody,
} from './finance.schemas.js';
import { asyncHandler } from '../../shared/middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../../shared/middlewares/validate.js';
import { FinanceService } from './finance.service.js';
import {
  authorizeOwnedClasses,
  authorizeOwnedFeeRecordParam,
  authorizeOwnedStudentBody,
  authorizeOwnedStudentQuery,
  authorizeOwnedTransactionParam,
  requireRoles,
} from '../identity/index.js';

export const financeRouter = Router();
const financeService = new FinanceService();

financeRouter.use(passport.authenticate('jwt', { session: false }));
financeRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

financeRouter.get('/finance/transactions', validate({ query: financeTransactionListQuerySchema }), authorizeOwnedStudentQuery(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<FinanceTransactionListQuery>(res);
  const result = await financeService.listTransactions(teacherId, {
    student_id: query.student_id,
    type: query.type,
    from: query.from,
    to: query.to,
    limit: query.limit,
    offset: query.offset,
  });

  res.json({
    transactions: result.items,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    },
  });
}));

financeRouter.post('/finance/transactions', validate({ body: financeTransactionBodySchema }), authorizeOwnedStudentBody('student_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const body = getValidatedBody<FinanceTransactionBody>(res);
  const transaction = await financeService.createTransaction(teacherId, body);

  res.status(201).json({ transaction });
}));

financeRouter.patch('/finance/transactions/:id', validate({
  body: updateFinanceTransactionBodySchema,
  params: idParamSchema,
}), authorizeOwnedTransactionParam('id'), authorizeOwnedStudentBody('student_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { id: transactionId } = getValidatedParams<IdParam>(res);
  const body = getValidatedBody<UpdateFinanceTransactionBody>(res);
  const transaction = await financeService.updateTransaction(teacherId, transactionId, body);

  res.json({ transaction });
}));

financeRouter.get('/finance/fee-records', validate({ query: financeFeeRecordListQuerySchema }), authorizeOwnedStudentQuery(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<FinanceFeeRecordListQuery>(res);
  const result = await financeService.listFeeRecords(teacherId, {
    student_id: query.student_id,
    session_id: query.session_id,
    status: query.status,
    from: query.from,
    to: query.to,
    limit: query.limit,
    offset: query.offset,
  });

  res.json({
    fee_records: result.items,
    pagination: {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    },
  });
}));

financeRouter.get('/finance/transactions/:id/audit-logs', validate({ params: idParamSchema }), authorizeOwnedTransactionParam('id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { id: transactionId } = getValidatedParams<IdParam>(res);
  const auditLogs = await financeService.listTransactionAuditLogs(teacherId, transactionId);

  res.json({ audit_logs: auditLogs });
}));

financeRouter.patch('/finance/fee-records/:id/status', validate({
  body: updateFeeRecordStatusBodySchema,
  params: idParamSchema,
}), authorizeOwnedFeeRecordParam('id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { id: feeRecordId } = getValidatedParams<IdParam>(res);
  const { status } = getValidatedBody<UpdateFeeRecordStatusBody>(res);
  const feeRecord = await financeService.updateFeeRecordStatus(teacherId, feeRecordId, status);

  res.json({ fee_record: feeRecord });
}));

financeRouter.get('/finance/balances', validate({ query: studentBalancesQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<StudentBalancesQuery>(res);
  const balances = await financeService.listStudentBalances(teacherId, {
    status: query.status,
    include_pending_archive: query.include_pending_archive,
  });

  res.json({ balances });
}));

financeRouter.get('/finance/summary', validate({ query: financeSummaryQuerySchema }), authorizeOwnedClasses('query', (query) => (query as { class_ids?: number[] } | undefined)?.class_ids), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const query = getValidatedQuery<FinanceSummaryQuery>(res);
  const summary = await financeService.getFinanceSummary(teacherId, {
    from: query.from,
    to: query.to,
    class_ids: query.class_ids,
    include_unpaid: query.include_unpaid,
  });

  res.json({ summary });
}));

function handleServiceError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

financeRouter.use(handleServiceError);
