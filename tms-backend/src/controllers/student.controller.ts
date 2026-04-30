import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { Teacher, TeacherRole } from '../entities/index.js';
import { StudentServiceError } from '../errors/student.error.js';
import {
  parseBulkExpelStudentsInput,
  parseBulkTransferStudentsInput,
  parseArchivePendingStudentInput,
  parseCreateStudentInput,
  parseExpelStudentInput,
  parseIdParam,
  parseReinstateStudentInput,
  parseStudentListFilters,
  parseTransferStudentInput,
  parseUpdateStudentInput,
} from '../helpers/student.helpers.js';
import {
  archivePendingStudent,
  bulkExpelStudents,
  bulkTransferStudents,
  createStudent,
  expelStudent,
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

  next(error);
}

studentRouter.get('/students', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const filters = parseStudentListFilters(req.query);
    const students = await listStudents(teacherId, filters);

    res.json({ students });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const payload = parseCreateStudentInput(req.body);
    const student = await createStudent(teacherId, payload);

    res.status(201).json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students/bulk/transfer', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const payload = parseBulkTransferStudentsInput(req.body);
    const students = await bulkTransferStudents(teacherId, payload);

    res.json({ students });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students/bulk/expel', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const payload = parseBulkExpelStudentsInput(req.body);
    const students = await bulkExpelStudents(teacherId, payload);

    res.json({ students });
  } catch (error) {
    next(error);
  }
});

studentRouter.get('/students/:studentId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parseIdParam(req.params.studentId, 'student_id');
    const student = await getStudentById(teacherId, studentId);

    res.json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.patch('/students/:studentId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parseIdParam(req.params.studentId, 'student_id');
    const payload = parseUpdateStudentInput(req.body);
    const student = await updateStudent(teacherId, studentId, payload);

    res.json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students/:studentId/transfer', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parseIdParam(req.params.studentId, 'student_id');
    const payload = parseTransferStudentInput(req.body);
    const student = await transferStudent(teacherId, studentId, payload);

    res.json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students/:studentId/expel', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parseIdParam(req.params.studentId, 'student_id');
    const payload = parseExpelStudentInput(req.body);
    const student = await expelStudent(teacherId, studentId, payload);

    res.json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students/:studentId/reinstate', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parseIdParam(req.params.studentId, 'student_id');
    const payload = parseReinstateStudentInput(req.body);
    const student = await reinstateStudent(teacherId, studentId, payload);

    res.json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.post('/students/:studentId/archive', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const studentId = parseIdParam(req.params.studentId, 'student_id');
    const payload = parseArchivePendingStudentInput(req.body);
    const student = await archivePendingStudent(teacherId, studentId, payload);

    res.json({ student });
  } catch (error) {
    next(error);
  }
});

studentRouter.use(handleStudentError);
