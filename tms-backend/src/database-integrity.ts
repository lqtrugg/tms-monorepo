import type { DataSource } from 'typeorm';

export async function installDatabaseIntegrityRules(dataSource: DataSource): Promise<void> {
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

  // ── Integrity Rule: Sessions cannot have the same scheduled_at within a class ──
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_no_duplicate
    ON sessions (teacher_id, class_id, scheduled_at)
    WHERE status <> 'cancelled';
  `);

  // ── Integrity Rule: Active students must have at least one active enrollment ──
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
}
