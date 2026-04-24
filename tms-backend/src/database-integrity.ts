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
}
