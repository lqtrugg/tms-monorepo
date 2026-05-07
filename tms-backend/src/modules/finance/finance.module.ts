import type { AppModule } from '../module.types.js';
import { CreateTransactionUseCase } from './application/commands/CreateTransactionUseCase.js';
import { UpdateFeeRecordStatusUseCase } from './application/commands/UpdateFeeRecordStatusUseCase.js';
import { UpdateTransactionUseCase } from './application/commands/UpdateTransactionUseCase.js';
import { FinanceReadService } from './application/queries/FinanceReadService.js';
import { GetIncomeReportUseCase } from './application/queries/GetIncomeReportUseCase.js';
import { TypeOrmFeeRecordRepository } from './infrastructure/persistence/typeorm/TypeOrmFeeRecordRepository.js';
import { TypeOrmFinanceReportReadRepository } from './infrastructure/persistence/typeorm/TypeOrmFinanceReportReadRepository.js';
import { TypeOrmTransactionReadRepository } from './infrastructure/persistence/typeorm/TypeOrmTransactionReadRepository.js';
import { TypeOrmTransactionRepository } from './infrastructure/persistence/typeorm/TypeOrmTransactionRepository.js';
import { FeeRecordOrmEntity } from './infrastructure/persistence/typeorm/FeeRecordOrmEntity.js';
import { TransactionAuditLogOrmEntity } from './infrastructure/persistence/typeorm/TransactionAuditLogOrmEntity.js';
import { TransactionOrmEntity } from './infrastructure/persistence/typeorm/TransactionOrmEntity.js';
import { FinanceController } from './presentation/controllers/FinanceController.js';
import { FinanceReportController } from './presentation/controllers/FinanceReportController.js';
import { createFinanceReportRouter } from './presentation/routes/finance-report.routes.js';
import { createFinanceRouter } from './presentation/routes/finance.routes.js';

const transactionRepository = new TypeOrmTransactionRepository();
const feeRecordRepository = new TypeOrmFeeRecordRepository();
const financeReadService = new FinanceReadService(new TypeOrmTransactionReadRepository());
const getIncomeReportUseCase = new GetIncomeReportUseCase(new TypeOrmFinanceReportReadRepository());

const financeRouter = createFinanceRouter({
  listTransactions: new FinanceController('listTransactions', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  createTransaction: new FinanceController('createTransaction', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  updateTransaction: new FinanceController('updateTransaction', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  listTransactionAuditLogs: new FinanceController('listTransactionAuditLogs', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  listFeeRecords: new FinanceController('listFeeRecords', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  updateFeeRecordStatus: new FinanceController('updateFeeRecordStatus', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  listStudentBalances: new FinanceController('listStudentBalances', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
  getFinanceSummary: new FinanceController('getFinanceSummary', {
    readService: financeReadService,
    createTransaction: new CreateTransactionUseCase(transactionRepository),
    updateTransaction: new UpdateTransactionUseCase(transactionRepository),
    updateFeeRecordStatus: new UpdateFeeRecordStatusUseCase(feeRecordRepository),
  }),
});

const financeReportRouter = createFinanceReportRouter(
  new FinanceReportController(getIncomeReportUseCase),
);

export const financeModule: AppModule = {
  name: 'finance',
  entities: [FeeRecordOrmEntity, TransactionOrmEntity, TransactionAuditLogOrmEntity],
  routes: [
    { path: '/', router: financeRouter },
    { path: '/', router: financeReportRouter },
  ],
};
