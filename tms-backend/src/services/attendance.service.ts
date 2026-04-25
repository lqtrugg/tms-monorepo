import { EntityManager, IsNull } from 'typeorm';

import { AppDataSource } from '../data-source.js';
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
  Student,
} from '../entities/index.js';
import { ServiceError } from '../errors/service.error.js';

type UpsertAttendanceInput = {
  status: AttendanceStatus;
  notes?: string | null;
};

type UpsertAttendanceSource = AttendanceSource.Bot | AttendanceSource.Manual;

function requireOwnedSession(manager: EntityManager, teacherId: number, sessionId: number): Promise<Session> {
  return manager.getRepository(Session).findOneBy({
    id: sessionId,
    teacher_id: teacherId,
  }).then((session) => {
    if (!session) {
      throw new ServiceError('session not found', 404);
    }

    return session;
  });
}

function requireOwnedClass(manager: EntityManager, teacherId: number, classId: number): Promise<Class> {
  return manager.getRepository(Class).findOneBy({
    id: classId,
    teacher_id: teacherId,
  }).then((classEntity) => {
    if (!classEntity) {
      throw new ServiceError('class not found', 404);
    }

    return classEntity;
  });
}

async function findEnrollmentAtSessionTime(
  manager: EntityManager,
  teacherId: number,
  studentId: number,
  classId: number,
  scheduledAt: Date,
): Promise<Enrollment | null> {
  return manager
    .getRepository(Enrollment)
    .createQueryBuilder('enrollment')
    .where('enrollment.teacher_id = :teacherId', { teacherId })
    .andWhere('enrollment.student_id = :studentId', { studentId })
    .andWhere('enrollment.class_id = :classId', { classId })
    .andWhere('enrollment.enrolled_at <= :scheduledAt', { scheduledAt })
    .andWhere('(enrollment.unenrolled_at IS NULL OR enrollment.unenrolled_at > :scheduledAt)', { scheduledAt })
    .orderBy('enrollment.enrolled_at', 'DESC')
    .getOne();
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
  const feeRecordRepo = manager.getRepository(FeeRecord);
  const existing = await feeRecordRepo.findOneBy({
    teacher_id: teacherId,
    session_id: session.id,
    student_id: studentId,
  });

  const shouldCharge = session.status !== SessionStatus.Cancelled
    && (status === AttendanceStatus.Present || status === AttendanceStatus.AbsentUnexcused);

  if (!shouldCharge) {
    if (existing && existing.status !== FeeRecordStatus.Cancelled) {
      existing.status = FeeRecordStatus.Cancelled;
      existing.cancelled_at = new Date();
      await feeRecordRepo.save(existing);
    }

    return;
  }

  if (!existing) {
    const feeRecord = feeRecordRepo.create({
      teacher_id: teacherId,
      student_id: studentId,
      session_id: session.id,
      enrollment_id: enrollment.id,
      amount: classEntity.fee_per_session,
      status: FeeRecordStatus.Active,
      cancelled_at: null,
    });

    await feeRecordRepo.save(feeRecord);
    return;
  }

  existing.enrollment_id = enrollment.id;
  existing.amount = classEntity.fee_per_session;
  existing.status = FeeRecordStatus.Active;
  existing.cancelled_at = null;
  await feeRecordRepo.save(existing);
}

export async function listSessionAttendance(teacherId: number, sessionId: number) {
  const session = await requireOwnedSession(AppDataSource.manager, teacherId, sessionId);

  const students = await AppDataSource
    .getRepository(Student)
    .createQueryBuilder('student')
    .innerJoin(
      Enrollment,
      'enrollment',
      `
        enrollment.teacher_id = student.teacher_id
        AND enrollment.student_id = student.id
        AND enrollment.class_id = :classId
        AND enrollment.enrolled_at <= :scheduledAt
        AND (enrollment.unenrolled_at IS NULL OR enrollment.unenrolled_at > :scheduledAt)
      `,
      { classId: session.class_id, scheduledAt: session.scheduled_at },
    )
    .where('student.teacher_id = :teacherId', { teacherId })
    .orderBy('student.full_name', 'ASC')
    .getMany();

  const attendanceRecords = await AppDataSource.getRepository(Attendance).find({
    where: {
      teacher_id: teacherId,
      session_id: sessionId,
    },
  });

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
    const student = await manager.getRepository(Student).findOneBy({
      id: studentId,
      teacher_id: teacherId,
    });

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

    const attendanceRepo = manager.getRepository(Attendance);
    let attendance = await attendanceRepo.findOneBy({
      teacher_id: teacherId,
      session_id: sessionId,
      student_id: studentId,
    });

    if (source === AttendanceSource.Bot && attendance?.source === AttendanceSource.Manual) {
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
      attendance = attendanceRepo.create({
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

    const saved = await attendanceRepo.save(attendance);

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
  const where = {
    teacher_id: teacherId,
    ...(filters.session_id !== undefined ? { session_id: filters.session_id } : {}),
    ...(filters.student_id !== undefined ? { student_id: filters.student_id } : {}),
    ...(filters.status !== undefined ? { status: filters.status } : {}),
  };

  return AppDataSource.getRepository(Attendance).find({
    where,
    order: {
      id: 'DESC',
    },
  });
}

export async function resetSessionAttendance(teacherId: number, sessionId: number): Promise<void> {
  const session = await requireOwnedSession(AppDataSource.manager, teacherId, sessionId);

  const existing = await AppDataSource.getRepository(Attendance).find({
    where: {
      teacher_id: teacherId,
      session_id: session.id,
    },
  });

  if (existing.length === 0) {
    return;
  }

  await AppDataSource.getRepository(Attendance).remove(existing);

  const feeRecords = await AppDataSource.getRepository(FeeRecord).find({
    where: {
      teacher_id: teacherId,
      session_id: session.id,
      status: FeeRecordStatus.Active,
      cancelled_at: IsNull(),
    },
  });

  if (feeRecords.length > 0) {
    feeRecords.forEach((item) => {
      item.status = FeeRecordStatus.Cancelled;
      item.cancelled_at = new Date();
    });
    await AppDataSource.getRepository(FeeRecord).save(feeRecords);
  }
}
