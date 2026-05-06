import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../../entities/index.js';
import { ServiceError } from '../../shared/errors/service.error.js';
import { StudentServiceError } from '../../shared/errors/student.error.js';
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
} from './enrollment.schemas.js';
import { asyncHandler } from '../../shared/middlewares/async-handler.js';
import { getValidatedBody, getValidatedParams, getValidatedQuery, validate } from '../../shared/middlewares/validate.js';
import { EnrollmentService } from './enrollment.service.js';
import {
  authorizeOwnedClassBody,
  authorizeOwnedClassQuery,
  authorizeOwnedStudentBody,
  authorizeOwnedStudentParam,
  requireRoles,
} from '../identity/index.js';

export const studentRouter = Router();
const enrollmentService = new EnrollmentService();

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

studentRouter.get('/students', validate({ query: studentListQuerySchema }), authorizeOwnedClassQuery(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const filters = getValidatedQuery<StudentListQuery>(res);
  const students = await enrollmentService.listStudents(teacherId, filters);

  res.json({ students });
}));

studentRouter.post('/students', validate({ body: createStudentBodySchema }), authorizeOwnedClassBody('class_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<CreateStudentBody>(res);
  const student = await enrollmentService.createStudent(teacherId, payload);

  res.status(201).json({ student });
}));

studentRouter.post('/students/bulk/transfer', validate({ body: bulkTransferStudentsBodySchema }), authorizeOwnedClassBody('to_class_id'), authorizeOwnedStudentBody('student_ids'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<BulkTransferStudentsBody>(res);
  const students = await enrollmentService.bulkTransferStudents(teacherId, payload);

  res.json({ students });
}));

studentRouter.post('/students/bulk/withdraw', validate({ body: bulkWithdrawStudentsBodySchema }), authorizeOwnedStudentBody('student_ids'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const payload = getValidatedBody<BulkWithdrawStudentsBody>(res);
  const students = await enrollmentService.bulkWithdrawStudents(teacherId, payload);

  res.json({ students });
}));

studentRouter.get('/students/:studentId', validate({ params: studentIdParamSchema }), authorizeOwnedStudentParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const student = await enrollmentService.getStudentById(teacherId, studentId);

  res.json({ student });
}));

studentRouter.patch('/students/:studentId', validate({
  body: updateStudentBodySchema,
  params: studentIdParamSchema,
}), authorizeOwnedStudentParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<UpdateStudentBody>(res);
  const student = await enrollmentService.updateStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/transfer', validate({
  body: transferStudentBodySchema,
  params: studentIdParamSchema,
}), authorizeOwnedStudentParam(), authorizeOwnedClassBody('to_class_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<TransferStudentBody>(res);
  const student = await enrollmentService.transferStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/withdraw', validate({
  body: withdrawStudentBodySchema,
  params: studentIdParamSchema,
}), authorizeOwnedStudentParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<WithdrawStudentBody>(res);
  const student = await enrollmentService.withdrawStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/reinstate', validate({
  body: reinstateStudentBodySchema,
  params: studentIdParamSchema,
}), authorizeOwnedStudentParam(), authorizeOwnedClassBody('class_id'), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<ReinstateStudentBody>(res);
  const student = await enrollmentService.reinstateStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.post('/students/:studentId/archive', validate({
  body: archivePendingStudentBodySchema,
  params: studentIdParamSchema,
}), authorizeOwnedStudentParam(), asyncHandler(async (req, res) => {
  const teacherId = getTeacherId(req);
  const { studentId } = getValidatedParams<StudentIdParam>(res);
  const payload = getValidatedBody<ArchivePendingStudentBody>(res);
  const student = await enrollmentService.archivePendingStudent(teacherId, studentId, payload);

  res.json({ student });
}));

studentRouter.use(handleStudentError);
