import type { AppModule } from '../module.types.js';
import { FeeRecord } from './domain/fee-record.entity.js';
import { TransactionAuditLog } from './domain/transaction-audit-log.entity.js';
import { Transaction } from './domain/transaction.entity.js';
import { financeReportRouter, financeRouter } from './index.js';

export const financeModule: AppModule = {
  name: 'finance',
  entities: [FeeRecord, Transaction, TransactionAuditLog],
  routes: [
    { path: '/', router: financeRouter },
    { path: '/', router: financeReportRouter },
  ],
};
