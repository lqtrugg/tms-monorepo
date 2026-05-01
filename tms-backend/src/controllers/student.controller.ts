import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import { StudentServiceError } from '../errors/student.error.js';
import {
  archivePendingStudentBodySchema,
  bulkWithdrawStudentsBodySchema,
  bulkTransferStudentsBodySchema,
  createStudentBodySchema,
  withdrawStudentBodySchema,
  reinstateStudentBodySchema,
  studentIdParamSchema,
  studentListQuerySchema,
  transferStudentBodySchema,
  updateStudentBodySchema,
  type ArchivePendingStudentBody,
  type BulkWithdrawStudentsBody,
  type BulkTransferStudentsBody,
  type CreateStudentBody,
  type WithdrawStudentBody,
  type ReinstateStudentBody,
  type StudentIdParam,
  type StudentListQuery,
  type TransferStudentBody,
  type UpdateStudentBody,
} from '../schemas/student.schemas.js';
import { asyncHandler } from '../middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../middlewares/validate.js';
import {
  archivePendingStudent,
  bulkWithdrawStudents,
  bulkTransferStudents,
  createStudent,
  withdrawStudent,
  getStudentById,
  listStudents,
  reinstateStudent,
  transferStudent,
  updateStudent,
} from '../services/student.service.js';
import { requireRoles } from '../services/auth.rbac.js';

export const studentRouter = Router();

studentRouter.use(passport.authenticate('jwt', { session: false }));
studentRouter.use(requireRoles([TeacherRole.Teacher]));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new StudentServiceError('unauthorized', 401);
  }

  return teacher.id;
}

function handleStudentError(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof StudentServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof ServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  next(error);
}

studentRouter.get('/students', validate({ query: studentListQuerySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const filters = getValidatedQuery<StudentListQuery>(res);
  const students = await listStudents(teacherId, filters);

  res.json({ students });
}));

studentRouter.post('/students', validate({ body: createStudentBodySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<CreateStudentBody>(res);
  const student = await createStudent(teacherId, payload);

  res.status(201).json({ student });
}));

studentRouter.post('/students/bulk/transfer', validate({ body: bulkTransferStudentsBodySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<BulkTransferStudentsBody>(res);
  const students = await bulkTransferStudents(teacherId, payload);

  res.json({ students });
}));

studentRouter.post('/students/bulk/withdraw', validate({ body: bulkWithdrawStudentsBodySchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<BulkWithdrawStudentsBody>(res);
  const students = await bulkWithdrawStudents(teacherId, payload);

  res.json({ students });
}));

studentRouter.get('/students/:studentId', validate({ params: studentIdParamSchema }), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const student = await getStudentById(teacherId, studentId);

  res.json({ student });
}));

studentRouter.patch('/students/:studentId', validate({
  body: updateStudentBodySchema,
  params: studentIdParamSchema,
}), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<UpdateStudentBody>(res);
  const student = await updateStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/transfer', validate({
  body: transferStudentBodySchema,
  params: studentIdParamSchema,
}), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<TransferStudentBody>(res);
  const student = await transferStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/withdraw', validate({
  body: withdrawStudentBodySchema,
  params: studentIdParamSchema,
}), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<WithdrawStudentBody>(res);
  const student = await withdrawStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/reinstate', validate({
  body: reinstateStudentBodySchema,
  params: studentIdParamSchema,
}), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<ReinstateStudentBody>(res);
  const student = await reinstateStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/archive', validate({
  body: archivePendingStudentBodySchema,
  params: studentIdParamSchema,
}), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<ArchivePendingStudentBody>(res);
  const student = await archivePendingStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.use(handleStudentError);
