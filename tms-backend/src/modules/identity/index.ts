export { adminRouter } from './admin.controller.js';
export { authRouter } from './auth.controller.js';
export { configurePassport } from './auth.passport.js';
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
} from './auth.ownership.js';
export { requireRoles } from './auth.rbac.js';
export { ensureSystemAdminAccount } from './auth.service.js';
