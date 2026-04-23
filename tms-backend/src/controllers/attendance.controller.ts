import { Router, type NextFunction, type Request, type Response } from 'express';
import passport from 'passport';

import { AttendanceStatus, Teacher } from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';
import { asRecord, parseOptionalString, parsePositiveInteger } from '../helpers/service.helpers.js';
import {
  listAttendanceRecords,
  listSessionAttendance,
  resetSessionAttendance,
  upsertSessionAttendance,
} from '../services/attendance.service.js';

export const attendanceRouter = Router();

attendanceRouter.use(passport.authenticate('jwt', { session: false }));

function getTeacherId(req: Request): number {
  const teacher = req.user as Teacher | undefined;

  if (!teacher) {
    throw new ServiceError('unauthorized', 401);
  }

  return teacher.id;
}

function parseAttendanceStatus(value: unknown): AttendanceStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value !== AttendanceStatus.Present
    && value !== AttendanceStatus.AbsentExcused
    && value !== AttendanceStatus.AbsentUnexcused
  ) {
    throw new ServiceError(
      `status must be one of: ${AttendanceStatus.Present}, ${AttendanceStatus.AbsentExcused}, ${AttendanceStatus.AbsentUnexcused}`,
      400,
    );
  }

  return value;
}

attendanceRouter.get('/sessions/:sessionId/attendance', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const sessionId = parsePositiveInteger(req.params.sessionId, 'session_id');
    const data = await listSessionAttendance(teacherId, sessionId);

    res.json(data);
  } catch (error) {
    next(error);
  }
});

attendanceRouter.put('/sessions/:sessionId/attendance/:studentId', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const sessionId = parsePositiveInteger(req.params.sessionId, 'session_id');
    const studentId = parsePositiveInteger(req.params.studentId, 'student_id');
    const body = asRecord(req.body, 'body');
    const status = parseAttendanceStatus(body.status);

    if (!status) {
      throw new ServiceError('status is required', 400);
    }

    const attendance = await upsertSessionAttendance(teacherId, sessionId, studentId, {
      status,
      notes: parseOptionalString(body.notes, 'notes') ?? null,
    });

    res.json({ attendance });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.get('/attendance', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const query = asRecord(req.query, 'query');
    const records = await listAttendanceRecords(teacherId, {
      session_id: query.session_id === undefined ? undefined : parsePositiveInteger(query.session_id, 'session_id'),
      student_id: query.student_id === undefined ? undefined : parsePositiveInteger(query.student_id, 'student_id'),
      status: parseAttendanceStatus(query.status),
    });

    res.json({ attendance: records });
  } catch (error) {
    next(error);
  }
});

attendanceRouter.delete('/sessions/:sessionId/attendance', async (req, res, next) => {
  try {
    const teacherId = getTeacherId(req);
    const sessionId = parsePositiveInteger(req.params.sessionId, 'session_id');
    await resetSessionAttendance(teacherId, sessionId);

    res.status(204).send();
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

attendanceRouter.use(handleServiceError);
