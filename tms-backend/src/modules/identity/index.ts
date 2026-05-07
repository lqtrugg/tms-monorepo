export { configurePassport } from './infrastructure/auth/configurePassport.js';
export {
  authorizeOwnedClassBody,
  authorizeOwnedClassParam,
  authorizeOwnedClassQuery,
  authorizeOwnedClasses,
  authorizeOwnedFeeRecordParam,
  authorizeOwnedSessionParam,
  authorizeOwnedStudentBody,
  authorizeOwnedStudentParam,
  authorizeOwnedStudentQuery,
  authorizeOwnedTopicParam,
  authorizeOwnedTransactionParam,
} from './presentation/middlewares/ownership.js';
export { requireRoles } from './presentation/middlewares/rbac.js';
export { ensureSystemAdminAccount } from './infrastructure/bootstrap/ensureSystemAdminAccount.js';
