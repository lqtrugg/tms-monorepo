import type { DataSource } from 'typeorm';

export async function installDatabaseIntegrityRules(dataSource: DataSource): Promise<void> {
  // ── R7: Refund balance — total refunds must not exceed total payments per (teacher, student) ──
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION enforce_transaction_refund_balance()
    RETURNS trigger AS $$
    DECLARE
      affected_teacher_id integer;
      affected_student_id integer;
      total_payments numeric;
      total_refunds numeric;
    BEGIN
      affected_teacher_id := COALESCE(NEW.teacher_id, OLD.teacher_id);
      affected_student_id := COALESCE(NEW.student_id, OLD.student_id);

      PERFORM pg_advisory_xact_lock(affected_teacher_id, affected_student_id);

      SELECT
        COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'refund' THEN ABS(amount) ELSE 0 END), 0)
      INTO total_payments, total_refunds
      FROM transactions
      WHERE teacher_id = affected_teacher_id
        AND student_id = affected_student_id;

      IF total_refunds > total_payments THEN
        RAISE EXCEPTION 'Tổng số tiền hoàn trả không được lớn hơn tổng số tiền đã nhận'
          USING ERRCODE = '23514',
            CONSTRAINT = 'chk_transactions_refund_not_over_payment';
      END IF;

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await dataSource.query('DROP TRIGGER IF EXISTS trg_transactions_refund_balance ON transactions');

  await dataSource.query(`
    CREATE CONSTRAINT TRIGGER trg_transactions_refund_balance
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    DEFERRABLE INITIALLY IMMEDIATE
    FOR EACH ROW
    EXECUTE FUNCTION enforce_transaction_refund_balance();
  `);

  // ── Unique sessions: no duplicate (teacher, class, scheduled_at) for non-cancelled sessions ──
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_no_duplicate
    ON sessions (teacher_id, class_id, scheduled_at)
    WHERE status <> 'cancelled';
  `);

  // ── R1: Active students must have at least one active enrollment ──
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION enforce_active_student_has_enrollment()
    RETURNS trigger AS $$
    DECLARE
      enrollment_count integer;
    BEGIN
      IF NEW.status = 'active' THEN
        SELECT COUNT(*) INTO enrollment_count
        FROM enrollments
        WHERE teacher_id = NEW.teacher_id
          AND student_id = NEW.id
          AND unenrolled_at IS NULL;

        IF enrollment_count = 0 THEN
          RAISE EXCEPTION 'Học sinh đang học phải có ít nhất một lớp đang enroll'
            USING ERRCODE = '23514',
              CONSTRAINT = 'chk_active_student_must_have_class';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await dataSource.query('DROP TRIGGER IF EXISTS trg_active_student_has_enrollment ON students');

  await dataSource.query(`
    CREATE CONSTRAINT TRIGGER trg_active_student_has_enrollment
    AFTER INSERT OR UPDATE OF status ON students
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_active_student_has_enrollment();
  `);

  // ── R3: Enrollments cannot be active (unenrolled_at IS NULL) if the class is archived ──
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION enforce_no_active_enrollment_in_archived_class()
    RETURNS trigger AS $$
    DECLARE
      class_status text;
    BEGIN
      IF NEW.unenrolled_at IS NULL THEN
        SELECT status INTO class_status
        FROM classes
        WHERE id = NEW.class_id;

        IF class_status = 'archived' THEN
          RAISE EXCEPTION 'Không thể tạo enrollment trong lớp đã đóng'
            USING ERRCODE = '23514',
              CONSTRAINT = 'chk_enrollment_class_must_be_active';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await dataSource.query('DROP TRIGGER IF EXISTS trg_no_active_enrollment_in_archived_class ON enrollments');

  await dataSource.query(`
    CREATE CONSTRAINT TRIGGER trg_no_active_enrollment_in_archived_class
    AFTER INSERT OR UPDATE ON enrollments
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_no_active_enrollment_in_archived_class();
  `);

  // ── R5: Topics must be closed (expires_at IS NOT NULL) when their class is archived ──
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION enforce_archive_class_closes_topics()
    RETURNS trigger AS $$
    DECLARE
      open_topic_count integer;
    BEGIN
      IF NEW.status = 'archived' THEN
        SELECT COUNT(*) INTO open_topic_count
        FROM topics
        WHERE class_id = NEW.id
          AND teacher_id = NEW.teacher_id
          AND expires_at IS NULL;

        IF open_topic_count > 0 THEN
          RAISE EXCEPTION 'Không thể đóng lớp khi còn % chuyên đề chưa đóng', open_topic_count
            USING ERRCODE = '23514',
              CONSTRAINT = 'chk_archived_class_no_open_topics';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await dataSource.query('DROP TRIGGER IF EXISTS trg_archive_class_closes_topics ON classes');

  await dataSource.query(`
    CREATE CONSTRAINT TRIGGER trg_archive_class_closes_topics
    AFTER UPDATE OF status ON classes
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_archive_class_closes_topics();
  `);

  // ── R12: Class schedules must not exist for archived classes ──
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION enforce_no_schedule_on_archived_class()
    RETURNS trigger AS $$
    DECLARE
      class_status text;
    BEGIN
      SELECT status INTO class_status
      FROM classes
      WHERE id = NEW.class_id;

      IF class_status = 'archived' THEN
        RAISE EXCEPTION 'Không thể tạo lịch học cho lớp đã đóng'
          USING ERRCODE = '23514',
          CONSTRAINT = 'chk_schedule_class_must_be_active';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await dataSource.query('DROP TRIGGER IF EXISTS trg_no_schedule_on_archived_class ON class_schedules');

  await dataSource.query(`
    CREATE CONSTRAINT TRIGGER trg_no_schedule_on_archived_class
    AFTER INSERT OR UPDATE ON class_schedules
    DEFERRABLE INITIALLY IMMEDIATE
    FOR EACH ROW
    EXECUTE FUNCTION enforce_no_schedule_on_archived_class();
  `);

  // ── R4: Fee records must be cancelled when their session is cancelled ──
  await dataSource.query(`
    CREATE OR REPLACE FUNCTION enforce_cancel_fees_on_session_cancel()
    RETURNS trigger AS $$
    DECLARE
      active_fee_count integer;
    BEGIN
      IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status <> 'cancelled') THEN
        SELECT COUNT(*) INTO active_fee_count
        FROM fee_records
        WHERE session_id = NEW.id
          AND status = 'active';

        IF active_fee_count > 0 THEN
          RAISE EXCEPTION 'Không thể huỷ buổi học khi còn % fee_record active chưa huỷ', active_fee_count
            USING ERRCODE = '23514',
              CONSTRAINT = 'chk_cancelled_session_no_active_fees';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await dataSource.query('DROP TRIGGER IF EXISTS trg_cancel_fees_on_session_cancel ON sessions');

  await dataSource.query(`
    CREATE CONSTRAINT TRIGGER trg_cancel_fees_on_session_cancel
    AFTER UPDATE OF status ON sessions
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION enforce_cancel_fees_on_session_cancel();
  `);
}
