import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../../data-source.js';
import {
  Attendance,
  AttendanceSource,
  AttendanceStatus,
  Class,
  Enrollment,
  FeeRecord,
  FeeRecordStatus,
  Session,
  SessionStatus,
} from '../../../entities/index.js';
import { ServiceError } from '../../../shared/errors/service.error.js';
import {
  createAttendance,
  createFeeRecord,
  findActiveFeeRecordsBySession,
  findAttendanceBySession,
  findAttendanceForStudent,
  findEnrollmentAtSessionTime,
  findEnrollmentsAtSessionTime,
  findFeeRecordForAttendance,
  findOwnedClass,
  findOwnedSession,
  findOwnedStudent,
  listAttendanceRecordsForTeacher,
  listStudentsEnrolledAtSessionTime,
  removeAttendanceRecords,
  saveAttendance,
  saveFeeRecord,
  saveFeeRecords,
} from './attendance.repository.js';

type UpsertAttendanceInput = {
  status: AttendanceStatus;
  notes?: string | null;
};

type UpsertAttendanceSource = AttendanceSource.Bot | AttendanceSource.Manual | AttendanceSource.System;

function requireOwnedSession(manager: EntityManager, teacherId: number, sessionId: number): Promise<Session> {
  return findOwnedSession(manager, teacherId, sessionId).then((session) => {
    if (!session) {
      throw new ServiceError('session not found', 404);
    }

    return session;
  });
}

function requireOwnedClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  return findOwnedClass(manager, teacherId, classId).then((classEntity) => {
    if (!classEntity) {
      throw new ServiceError('class not found', 404);
    }

    return classEntity;
  });
}

async function syncFeeRecordByAttendance(
  manager: EntityManager,
  teacherId: number,
  session: Session,
  classEntity: Class,
  enrollment: Enrollment,
  studentId: number,
  status: AttendanceStatus,
): Promise<void> {
  const existing = await findFeeRecordForAttendance(manager, teacherId, session.id, studentId);

  const shouldCharge = session.status !== SessionStatus.Cancelled
    && (status === AttendanceStatus.Present || status === AttendanceStatus.AbsentUnexcused);

  if (!shouldCharge) {
    if (existing && existing.status !== FeeRecordStatus.Cancelled) {
      existing.status = FeeRecordStatus.Cancelled;
      existing.cancelled_at = new Date();
      await saveFeeRecord(manager, existing);
    }

    return;
  }

  if (!existing) {
    const feeRecord = createFeeRecord(manager, {
      teacher_id: teacherId,
      student_id: studentId,
      session_id: session.id,
      enrollment_id: enrollment.id,
      amount: classEntity.fee_per_session,
      status: FeeRecordStatus.Active,
      cancelled_at: null,
    });

    await saveFeeRecord(manager, feeRecord);
    return;
  }

  existing.enrollment_id = enrollment.id;
  existing.amount = classEntity.fee_per_session;
  existing.status = FeeRecordStatus.Active;
  existing.cancelled_at = null;
  await saveFeeRecord(manager, existing);
}

export async function listSessionAttendance(teacherId: number, sessionId: number) {
  const session = await requireOwnedSession(AppDataSource.manager, teacherId, sessionId);

  const students = await listStudentsEnrolledAtSessionTime(
    AppDataSource.manager,
    teacherId,
    session.class_id,
    session.scheduled_at,
  );

  const attendanceRecords = await findAttendanceBySession(AppDataSource.manager, teacherId, sessionId);

  const attendanceByStudentId = new Map<number, Attendance>();
  attendanceRecords.forEach((record) => {
    attendanceByStudentId.set(record.student_id, record);
  });

  const rows = students.map((student) => {
    const attendance = attendanceByStudentId.get(student.id);

    return {
      student_id: student.id,
      student_name: student.full_name,
      student_status: student.status,
      attendance_id: attendance?.id ?? null,
      attendance_status: attendance?.status ?? null,
      source: attendance?.source ?? null,
      notes: attendance?.notes ?? null,
      overridden_at: attendance?.overridden_at ?? null,
    };
  });

  return {
    session,
    attendance: rows,
  };
}

export async function upsertSessionAttendance(
  teacherId: number,
  sessionId: number,
  studentId: number,
  input: UpsertAttendanceInput,
) {
  return upsertSessionAttendanceWithSource(teacherId, sessionId, studentId, input, AttendanceSource.Manual);
}

export async function upsertBotSessionAttendance(
  teacherId: number,
  sessionId: number,
  studentId: number,
): Promise<Attendance | null> {
  return upsertSessionAttendanceWithSource(
    teacherId,
    sessionId,
    studentId,
    {
      status: AttendanceStatus.Present,
      notes: null,
    },
    AttendanceSource.Bot,
  );
}

export async function materializeSessionAttendance(teacherId: number, sessionId: number): Promise<{
  attendance_created: number;
  fee_records_synced: number;
}> {
  return AppDataSource.transaction(async (manager) => {
    const session = await requireOwnedSession(manager, teacherId, sessionId);

    if (session.status === SessionStatus.Cancelled) {
      return {
        attendance_created: 0,
        fee_records_synced: 0,
      };
    }

    const classEntity = await requireOwnedClass(manager, teacherId, session.class_id);
    const enrollments = await findEnrollmentsAtSessionTime(manager, teacherId, session.class_id, session.scheduled_at);
    let attendanceCreated = 0;
    let feeRecordsSynced = 0;

    for (const enrollment of enrollments) {
      let attendance = await findAttendanceForStudent(manager, teacherId, sessionId, enrollment.student_id);

      if (!attendance) {
        attendance = createAttendance(manager, {
          teacher_id: teacherId,
          session_id: sessionId,
          student_id: enrollment.student_id,
          status: AttendanceStatus.AbsentUnexcused,
          source: AttendanceSource.System,
          overridden_at: null,
          notes: null,
        });
        attendance = await saveAttendance(manager, attendance);
        attendanceCreated += 1;
      }

      await syncFeeRecordByAttendance(
        manager,
        teacherId,
        session,
        classEntity,
        enrollment,
        enrollment.student_id,
        attendance.status,
      );
      feeRecordsSynced += 1;
    }

    return {
      attendance_created: attendanceCreated,
      fee_records_synced: feeRecordsSynced,
    };
  });
}

async function upsertSessionAttendanceWithSource(
  teacherId: number,
  sessionId: number,
  studentId: number,
  input: UpsertAttendanceInput,
  source: UpsertAttendanceSource,
) {
  return AppDataSource.transaction(async (manager) => {
    const session = await requireOwnedSession(manager, teacherId, sessionId);
    const classEntity = await requireOwnedClass(manager, teacherId, session.class_id);
    const student = await findOwnedStudent(manager, teacherId, studentId);

    if (!student) {
      throw new ServiceError('student not found', 404);
    }

    const enrollment = await findEnrollmentAtSessionTime(
      manager,
      teacherId,
      studentId,
      session.class_id,
      session.scheduled_at,
    );

    if (!enrollment) {
      throw new ServiceError('student is not enrolled in class at this session', 409);
    }

    if (session.status === SessionStatus.Cancelled) {
      throw new ServiceError('cannot update attendance for a cancelled session', 409);
    }

    let attendance = await findAttendanceForStudent(manager, teacherId, sessionId, studentId);

    if (source === AttendanceSource.Bot && attendance?.source === AttendanceSource.Manual) {
      return null;
    }

    if (source === AttendanceSource.Bot && attendance?.status === AttendanceStatus.AbsentExcused) {
      return null;
    }

    if (
      source === AttendanceSource.Bot
      && attendance?.source === AttendanceSource.Bot
      && attendance.status === input.status
    ) {
      return attendance;
    }

    if (!attendance) {
      attendance = createAttendance(manager, {
        teacher_id: teacherId,
        session_id: sessionId,
        student_id: studentId,
        status: input.status,
        source,
        overridden_at: source === AttendanceSource.Manual ? new Date() : null,
        notes: input.notes ?? null,
      });
    } else {
      attendance.status = input.status;
      attendance.source = source;
      attendance.overridden_at = source === AttendanceSource.Manual ? new Date() : null;
      if (input.notes !== undefined) {
        attendance.notes = input.notes;
      }
    }

    const saved = await saveAttendance(manager, attendance);

    await syncFeeRecordByAttendance(
      manager,
      teacherId,
      session,
      classEntity,
      enrollment,
      studentId,
      input.status,
    );

    return saved;
  });
}

export async function listAttendanceRecords(teacherId: number, filters: {
  session_id?: number;
  student_id?: number;
  status?: AttendanceStatus;
}) {
  return listAttendanceRecordsForTeacher(AppDataSource.manager, teacherId, filters);
}

export async function resetSessionAttendance(teacherId: number, sessionId: number): Promise<void> {
  const session = await requireOwnedSession(AppDataSource.manager, teacherId, sessionId);

  const existing = await findAttendanceBySession(AppDataSource.manager, teacherId, session.id);

  if (existing.length === 0) {
    return;
  }

  await removeAttendanceRecords(AppDataSource.manager, existing);

  const feeRecords = await findActiveFeeRecordsBySession(AppDataSource.manager, teacherId, session.id);

  if (feeRecords.length > 0) {
    feeRecords.forEach((item) => {
      item.status = FeeRecordStatus.Cancelled;
      item.cancelled_at = new Date();
    });
    await saveFeeRecords(AppDataSource.manager, feeRecords);
  }
}
