# Database Schema — Nghiệp vụ dạy lập trình thi đấu

---

## Tables

- [teachers](#teachers)
- [students](#students)
- [classes](#classes)
- [class_schedules](#class_schedules)
- [sessions](#sessions)
- [enrollments](#enrollments)
- [attendance](#attendance)
- [fee_records](#fee_records)
- [transactions](#transactions)
- [codeforces_groups](#codeforces_groups)
- [topics](#topics)
- [topic_problems](#topic_problems)
- [topic_standings](#topic_standings)
- [discord_servers](#discord_servers)
- [discord_messages](#discord_messages)
- [discord_message_recipients](#discord_message_recipients)

---

## Notes

- Monetary amounts are stored as `NUMERIC(12,0)`, unit: VNĐ.
- **Sign convention** cho `transactions.amount`: **positive = thu tiền**, **negative = hoàn trả**.
- **Balance công thức (derived, not stored):**
  ```
  balance = SUM(transactions.amount)
           - SUM(fee_records.amount WHERE status = 'active')
  ```
  Kết quả âm → học sinh đang nợ. Kết quả dương → học sinh đang dư.
- Tất cả `TIMESTAMPTZ` dùng timezone UTC, render về `Asia/Ho_Chi_Minh` ở application layer.
- **Data isolation:** mọi bảng đều có `teacher_id`. Mọi query luôn filter theo `teacher_id` của session đang đăng nhập.

---

## teachers

```sql
CREATE TABLE teachers (
    id            SERIAL       PRIMARY KEY,
    username      VARCHAR(100) NOT NULL,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_teachers_username UNIQUE (username)
);
```

---

## students

```sql
CREATE TYPE student_status AS ENUM ('active', 'pending_archive', 'archived');
CREATE TYPE pending_archive_reason AS ENUM ('needs_collection', 'needs_refund');

CREATE TABLE students (
    id                     SERIAL                 PRIMARY KEY,
    teacher_id             INTEGER                NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    full_name              VARCHAR(255)           NOT NULL,
    codeforces_handle      VARCHAR(100),
    phone                  VARCHAR(20),
    note                   TEXT,
    status                 student_status         NOT NULL DEFAULT 'active',
    pending_archive_reason pending_archive_reason,
    -- NOT NULL khi status = 'pending_archive', NULL trong mọi trường hợp còn lại
    created_at             TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    archived_at            TIMESTAMPTZ,

    CONSTRAINT chk_students_pending_archive_reason CHECK (
        (status = 'pending_archive' AND pending_archive_reason IS NOT NULL)
        OR (status <> 'pending_archive' AND pending_archive_reason IS NULL)
    ),
    CONSTRAINT chk_students_archived_at CHECK (
        (status = 'archived' AND archived_at IS NOT NULL)
        OR (status <> 'archived' AND archived_at IS NULL)
    )
);

CREATE INDEX idx_students_teacher_id ON students (teacher_id);
CREATE INDEX idx_students_status     ON students (status);
```

**Ghi chú trạng thái:**

| `status`          | Ý nghĩa                                            | Xuất hiện trong tra cứu nợ? |
|-------------------|----------------------------------------------------|-----------------------------|
| `active`          | Đang học                                           | ✅                           |
| `pending_archive` | Bị đuổi, đang chờ xử lý tài chính tồn đọng        | ❌                           |
| `archived`        | Đã kết thúc quan hệ, tài chính đã thanh toán xong | ❌                           |

---

## classes

```sql
CREATE TYPE class_status AS ENUM ('active', 'archived');

CREATE TABLE classes (
    id              SERIAL        PRIMARY KEY,
    teacher_id      INTEGER       NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    name            VARCHAR(255)  NOT NULL,
    fee_per_session NUMERIC(12,0) NOT NULL CHECK (fee_per_session >= 0),
    status          class_status  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    archived_at     TIMESTAMPTZ,

    CONSTRAINT chk_classes_archived_at CHECK (
        (status = 'archived' AND archived_at IS NOT NULL)
        OR (status = 'active' AND archived_at IS NULL)
    )
);

CREATE INDEX idx_classes_teacher_id ON classes (teacher_id);
CREATE INDEX idx_classes_status     ON classes (status);
```

---

## class_schedules

Lịch dạy recurring. Mỗi lớp có thể có nhiều slot trong tuần với khung giờ bắt đầu/kết thúc cố định.

```sql
CREATE TABLE class_schedules (
    id              SERIAL    PRIMARY KEY,
    teacher_id      INTEGER   NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    class_id        INTEGER   NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    day_of_week     SMALLINT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    -- 0 = Chủ nhật, 1 = Thứ hai, ..., 6 = Thứ bảy
    start_time      TIME      NOT NULL,
    end_time        TIME      NOT NULL,

    CONSTRAINT chk_class_schedules_time_range CHECK (
        end_time > start_time
    )
);

CREATE INDEX idx_class_schedules_teacher_id ON class_schedules (teacher_id);
CREATE INDEX idx_class_schedules_class_id   ON class_schedules (class_id);
```

---

## sessions

Buổi học cụ thể. Được auto-generate từ `class_schedules`; giáo viên có thể thêm thủ công hoặc huỷ từng buổi.

Khi huỷ (`status = 'cancelled'`): tất cả `fee_records` gắn với buổi này bị cancelled theo; `attendance` giữ nguyên để lưu lịch sử.

```sql
CREATE TYPE session_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE sessions (
    id           SERIAL         PRIMARY KEY,
    teacher_id   INTEGER        NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    class_id     INTEGER        NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    scheduled_at TIMESTAMPTZ    NOT NULL,
    status       session_status NOT NULL DEFAULT 'scheduled',
    is_manual    BOOLEAN        NOT NULL DEFAULT FALSE,
    -- TRUE nếu giáo viên thêm ngoài lịch recurring
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,

    CONSTRAINT chk_sessions_cancelled CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR (status <> 'cancelled' AND cancelled_at IS NULL)
    )
);

CREATE INDEX idx_sessions_teacher_id   ON sessions (teacher_id);
CREATE INDEX idx_sessions_class_id     ON sessions (class_id);
CREATE INDEX idx_sessions_scheduled_at ON sessions (scheduled_at);
CREATE INDEX idx_sessions_status       ON sessions (status);
```

---

## enrollments

Lịch sử học sinh ↔ lớp. Mỗi học sinh chỉ có tối đa một enrollment active tại mọi thời điểm.

Mỗi khi chuyển lớp: set `unenrolled_at` trên bản ghi cũ, tạo bản ghi mới cho lớp mới.

```sql
CREATE TABLE enrollments (
    id            SERIAL      PRIMARY KEY,
    teacher_id    INTEGER     NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    student_id    INTEGER     NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    class_id      INTEGER     NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unenrolled_at TIMESTAMPTZ,
    -- NULL = đang học lớp này

    CONSTRAINT chk_enrollments_dates CHECK (
        unenrolled_at IS NULL OR unenrolled_at > enrolled_at
    )
);

-- Mỗi học sinh chỉ có một enrollment active tại một thời điểm
CREATE UNIQUE INDEX uq_enrollments_one_active_per_student
    ON enrollments (teacher_id, student_id)
    WHERE unenrolled_at IS NULL;

CREATE INDEX idx_enrollments_teacher_id ON enrollments (teacher_id);
CREATE INDEX idx_enrollments_student_id ON enrollments (student_id);
CREATE INDEX idx_enrollments_class_id   ON enrollments (class_id);
```

---

## attendance

Điểm danh theo từng học sinh trên từng buổi học. Nguồn mặc định là bot Discord; giáo viên có thể override thủ công.

```sql
CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent_excused',
    'absent_unexcused'
);
CREATE TYPE attendance_source AS ENUM ('bot', 'manual');

CREATE TABLE attendance (
    id            SERIAL            PRIMARY KEY,
    teacher_id    INTEGER           NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    session_id    INTEGER           NOT NULL REFERENCES sessions (id) ON DELETE RESTRICT,
    student_id    INTEGER           NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    status        attendance_status NOT NULL,
    source        attendance_source NOT NULL DEFAULT 'bot',
    overridden_at TIMESTAMPTZ,
    notes         TEXT,

    CONSTRAINT uq_attendance_session_student UNIQUE (session_id, student_id),
    CONSTRAINT chk_attendance_override CHECK (
        (source = 'manual' AND overridden_at IS NOT NULL)
        OR (source = 'bot'  AND overridden_at IS NULL)
    )
);

CREATE INDEX idx_attendance_teacher_id ON attendance (teacher_id);
CREATE INDEX idx_attendance_session_id ON attendance (session_id);
CREATE INDEX idx_attendance_student_id ON attendance (student_id);
```

**Quy tắc sinh `fee_records` từ attendance:**

| `attendance.status` | Tạo `fee_record`? |
|---------------------|-------------------|
| `present`           | ✅                 |
| `absent_unexcused`  | ✅                 |
| `absent_excused`    | ❌                 |

---

## fee_records

Bản ghi học phí phát sinh theo từng buổi học. `amount` là snapshot của `classes.fee_per_session` tại thời điểm tạo — không bị ảnh hưởng bởi thay đổi học phí sau đó.

Khi session bị cancelled → tất cả `fee_records` có `session_id` đó được set `status = 'cancelled'`.

```sql
CREATE TYPE fee_record_status AS ENUM ('active', 'cancelled');

CREATE TABLE fee_records (
    id            SERIAL            PRIMARY KEY,
    teacher_id    INTEGER           NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    student_id    INTEGER           NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    session_id    INTEGER           NOT NULL REFERENCES sessions (id) ON DELETE RESTRICT,
    enrollment_id INTEGER           NOT NULL REFERENCES enrollments (id) ON DELETE RESTRICT,
    amount        NUMERIC(12,0)     NOT NULL CHECK (amount > 0),
    -- Snapshot của classes.fee_per_session lúc tạo bản ghi
    status        fee_record_status NOT NULL DEFAULT 'active',
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    cancelled_at  TIMESTAMPTZ,

    CONSTRAINT uq_fee_records_student_session UNIQUE (student_id, session_id),
    CONSTRAINT chk_fee_records_cancelled CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR (status = 'active'  AND cancelled_at IS NULL)
    )
);

CREATE INDEX idx_fee_records_teacher_id ON fee_records (teacher_id);
CREATE INDEX idx_fee_records_student_id ON fee_records (student_id);
CREATE INDEX idx_fee_records_session_id ON fee_records (session_id);
CREATE INDEX idx_fee_records_status     ON fee_records (status);
```

---

## transactions

Giao dịch tài chính, ghi thủ công bởi giáo viên sau khi thu/hoàn tiền qua kênh bất kỳ.

```sql
CREATE TYPE transaction_type AS ENUM ('payment', 'refund');

CREATE TABLE transactions (
    id          SERIAL           PRIMARY KEY,
    teacher_id  INTEGER          NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    student_id  INTEGER          NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    amount      NUMERIC(12,0)    NOT NULL CHECK (amount <> 0),
    -- payment: amount > 0 | refund: amount < 0
    type        transaction_type NOT NULL,
    recorded_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    notes       TEXT,

    CONSTRAINT chk_transactions_amount_sign CHECK (
        (type = 'payment' AND amount > 0)
        OR (type = 'refund' AND amount < 0)
    )
);

CREATE INDEX idx_transactions_teacher_id  ON transactions (teacher_id);
CREATE INDEX idx_transactions_student_id  ON transactions (student_id);
CREATE INDEX idx_transactions_recorded_at ON transactions (recorded_at);
```

---

## codeforces_groups

Liên kết giữa lớp học và Codeforces group. Mỗi lớp có tối đa một group.

```sql
CREATE TABLE codeforces_groups (
    id         SERIAL       PRIMARY KEY,
    teacher_id INTEGER      NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    class_id   INTEGER      NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    group_url  TEXT         NOT NULL,
    group_name VARCHAR(255),

    CONSTRAINT uq_codeforces_groups_class_id UNIQUE (class_id)
);

CREATE INDEX idx_codeforces_groups_teacher_id ON codeforces_groups (teacher_id);
```

---

## topics

Chuyên đề học, tương ứng với một GYM contest trên Codeforces. `expires_at` được pull từ Codeforces API lúc thêm chuyên đề.

Hệ thống chỉ auto-pull standing cho các chuyên đề còn hiệu lực (`expires_at > NOW()`).

```sql
CREATE TABLE topics (
    id                    SERIAL       PRIMARY KEY,
    teacher_id            INTEGER      NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    class_id              INTEGER      NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    title                 VARCHAR(255) NOT NULL,
    gym_link              TEXT         NOT NULL,
    gym_id                VARCHAR(50),
    -- Extract từ gym_link, dùng để gọi Codeforces API
    expires_at            TIMESTAMPTZ,
    -- NULL nếu API không trả về thời hạn
    pull_interval_minutes INTEGER      NOT NULL DEFAULT 60 CHECK (pull_interval_minutes > 0),
    last_pulled_at        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topics_teacher_id ON topics (teacher_id);
CREATE INDEX idx_topics_class_id   ON topics (class_id);
CREATE INDEX idx_topics_expires_at ON topics (expires_at);
```

---

## topic_problems

Danh sách bài toán trong một chuyên đề. Được sync từ Codeforces API cùng lúc pull standing.

```sql
CREATE TABLE topic_problems (
    id           SERIAL       PRIMARY KEY,
    teacher_id   INTEGER      NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    topic_id     INTEGER      NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
    problem_index VARCHAR(10) NOT NULL,
    -- Ký hiệu bài trong contest: A, B, C, ... hoặc 1A, 1B, ...
    problem_name VARCHAR(255),

    CONSTRAINT uq_topic_problems_topic_index UNIQUE (topic_id, problem_index)
);

CREATE INDEX idx_topic_problems_teacher_id ON topic_problems (teacher_id);
CREATE INDEX idx_topic_problems_topic_id   ON topic_problems (topic_id);
```

---

## topic_standings

Kết quả của từng học sinh trên từng bài toán trong một chuyên đề. Được upsert mỗi lần pull từ Codeforces API. Mỗi hàng là một cặp (student, problem) — render thành bảng standing dạng học sinh × bài toán ở application layer.

```sql
CREATE TABLE topic_standings (
    id               SERIAL      PRIMARY KEY,
    teacher_id       INTEGER     NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    topic_id         INTEGER     NOT NULL REFERENCES topics (id) ON DELETE CASCADE,
    student_id       INTEGER     NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    problem_id       INTEGER     NOT NULL REFERENCES topic_problems (id) ON DELETE CASCADE,
    solved           BOOLEAN     NOT NULL DEFAULT FALSE,
    penalty_minutes  INTEGER,
    -- NULL nếu chưa giải, số phút theo quy tắc tính điểm của Codeforces nếu đã giải
    pulled_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_topic_standings_student_problem UNIQUE (topic_id, student_id, problem_id)
);

CREATE INDEX idx_topic_standings_teacher_id ON topic_standings (teacher_id);
CREATE INDEX idx_topic_standings_topic_id   ON topic_standings (topic_id);
CREATE INDEX idx_topic_standings_student_id ON topic_standings (student_id);
```

---

## discord_servers

Discord server liên kết với một lớp học. Lưu cấu hình bot: voice channel dùng để poll điểm danh và text channel dùng để post thông báo tự động.

```sql
CREATE TABLE discord_servers (
    id                          SERIAL       PRIMARY KEY,
    teacher_id                  INTEGER      NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    class_id                    INTEGER      NOT NULL REFERENCES classes (id) ON DELETE RESTRICT,
    discord_server_id           VARCHAR(50)  NOT NULL,
    -- Discord Snowflake ID của server
    name                        VARCHAR(255),
    attendance_voice_channel_id VARCHAR(50),
    -- Snowflake ID của voice channel dùng để poll điểm danh
    notification_channel_id     VARCHAR(50),
    -- Snowflake ID của text channel dùng để post thông báo tự động

    CONSTRAINT uq_discord_servers_class_id UNIQUE (class_id),
    CONSTRAINT uq_discord_servers_server_id UNIQUE (teacher_id, discord_server_id)
);

CREATE INDEX idx_discord_servers_teacher_id ON discord_servers (teacher_id);
```

---

## discord_messages

Lịch sử tất cả tin nhắn gửi qua bot — bao gồm thông báo tự động của hệ thống, channel post thủ công, và bulk DM thủ công.

```sql
CREATE TYPE discord_message_type AS ENUM (
    'auto_notification',
    -- Hệ thống tự trigger theo sự kiện, gửi vào notification_channel của server
    'channel_post',
    -- Giáo viên soạn thủ công, gửi vào channel chung của server
    'bulk_dm'
    -- Giáo viên soạn thủ công, gửi DM riêng từng học sinh
);

CREATE TABLE discord_messages (
    id          SERIAL               PRIMARY KEY,
    teacher_id  INTEGER              NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    type        discord_message_type NOT NULL,
    content     TEXT                 NOT NULL,
    server_id   INTEGER              REFERENCES discord_servers (id) ON DELETE SET NULL,
    -- NOT NULL với auto_notification và channel_post, NULL với bulk_dm
    created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_discord_messages_server CHECK (
        (type IN ('auto_notification', 'channel_post') AND server_id IS NOT NULL)
        OR (type = 'bulk_dm' AND server_id IS NULL)
    )
);

CREATE INDEX idx_discord_messages_teacher_id ON discord_messages (teacher_id);
CREATE INDEX idx_discord_messages_type       ON discord_messages (type);
CREATE INDEX idx_discord_messages_created_at ON discord_messages (created_at);
```

---

## discord_message_recipients

Trạng thái gửi của từng người nhận trong một lần bulk DM. Chỉ tồn tại với `discord_messages.type = 'bulk_dm'`.

```sql
CREATE TYPE discord_send_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE discord_message_recipients (
    id                 SERIAL              PRIMARY KEY,
    teacher_id         INTEGER             NOT NULL REFERENCES teachers (id) ON DELETE RESTRICT,
    discord_message_id INTEGER             NOT NULL REFERENCES discord_messages (id) ON DELETE CASCADE,
    student_id         INTEGER             NOT NULL REFERENCES students (id) ON DELETE RESTRICT,
    status             discord_send_status NOT NULL DEFAULT 'pending',
    sent_at            TIMESTAMPTZ,
    error_detail       TEXT,
    -- Lưu lý do thất bại nếu status = 'failed'

    CONSTRAINT uq_discord_message_recipients UNIQUE (discord_message_id, student_id),
    CONSTRAINT chk_discord_recipients_sent_at CHECK (
        (status = 'sent'    AND sent_at IS NOT NULL)
        OR (status <> 'sent' AND sent_at IS NULL)
    )
);

CREATE INDEX idx_discord_message_recipients_teacher_id         ON discord_message_recipients (teacher_id);
CREATE INDEX idx_discord_message_recipients_discord_message_id ON discord_message_recipients (discord_message_id);
CREATE INDEX idx_discord_message_recipients_student_id         ON discord_message_recipients (student_id);
```

---

## Sơ đồ quan hệ

```
                          teachers
                              │
           teacher_id (mọi bảng đều có)
                              │
        ┌─────────────────────┼──────────────────┬──────────────────────┐
        ▼                     ▼                  ▼                      ▼
    students               classes          transactions        discord_messages
        │                     │                                         │
        │          ┌──────────┼─────────────────────────┐               │
        │          ▼          ▼                         ▼               ▼
        │    class_schedules sessions            discord_servers  discord_message_recipients
        │                     │                 topics
        │                     │                   ├──► topic_problems
        │                     │                   └──► topic_standings
        │               ┌─────┴──────┐
        │               ▼            ▼
        └──── enrollments        attendance
                    │                │
                    └──► fee_records ┘
```
