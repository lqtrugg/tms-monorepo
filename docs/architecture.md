# Kiến trúc Service-Based

---

## Tổng quan

```
                        ┌─────────────┐
                        │ Auth Service│
                        └──────┬──────┘
                               │ teacher_id (mọi request đều mang theo)
           ┌───────────────────┼────────────────────┐
           │                   │                    │
    ┌──────▼──────┐    ┌───────▼──────┐    ┌───────▼───────┐
    │   Student   │    │    Class     │    │   Messaging   │
    │   Service   │    │   Service    │    │    Service    │
    └──────┬──────┘    └───────┬──────┘    └───────────────┘
           │                   │
    ┌──────▼───────────────────▼──────┐
    │          Attendance Service      │
    └──────────────────┬──────────────┘
                       │
              ┌────────▼────────┐
              │ Finance Service │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │Reporting Service│
              └─────────────────┘

    ┌──────────────────────────────────┐
    │           Topic Service          │
    └──────────────┬───────────────────┘
                   │
    ┌──────────────▼───────────────────┐
    │      Learning Profile Service    │
    └──────────────────────────────────┘
```

---

## Services

---

### 1. Auth Service

**Owns:** `teachers`

**Trách nhiệm:** Đăng ký, đăng nhập, đăng xuất. Phát hành token mang `teacher_id` — mọi service khác dùng `teacher_id` này để scope dữ liệu, không gọi lại Auth Service.

**Phụ thuộc:** Không có.

---

### 2. Student Service

**Owns:** `students`, `enrollments`

**Trách nhiệm:** Toàn bộ vòng đời học sinh — thêm mới, chuyển lớp, đuổi học, archive. Quản lý trạng thái `active / pending_archive / archived` và danh sách cần đòi / cần trả.

**Phụ thuộc:**
- **Class Service** *(sync)* — khi chuyển lớp, cần xác nhận lớp đích tồn tại và đang `active`.
- **Finance Service** *(sync)* — khi đuổi học, cần lấy số dư hiện tại để xác định trạng thái `pending_archive`.

**Được gọi bởi:** Attendance Service, Finance Service, Topic Service, Messaging Service, Reporting Service — để resolve `student_id`.

---

### 3. Class Service

**Owns:** `classes`, `class_schedules`, `sessions`, `codeforces_groups`

**Trách nhiệm:** Quản lý lớp, lịch dạy recurring, auto-generate buổi học, thêm/huỷ buổi thủ công, liên kết Codeforces group.

**Phụ thuộc:** Không có.

**Được gọi bởi:** Student Service, Attendance Service, Finance Service, Topic Service — để resolve `class_id` và `session_id`.

**Event phát ra:**
- `session.cancelled` → Finance Service huỷ toàn bộ `fee_records` của buổi đó.

---

### 4. Attendance Service

**Owns:** `attendance`

**Trách nhiệm:** Nhận điểm danh từ bot Discord, cho phép giáo viên override thủ công, approve nghỉ có lí do.

**Phụ thuộc:**
- **Class Service** *(sync)* — resolve `session_id`.
- **Student Service** *(sync)* — resolve `student_id`.

**Event phát ra:**
- `attendance.upserted` → Finance Service tạo hoặc huỷ `fee_record` tương ứng.

---

### 5. Finance Service

**Owns:** `fee_records`, `transactions`

**Trách nhiệm:** Tự động tạo / huỷ `fee_records` theo sự kiện từ Attendance và Class Service. Ghi nhận giao dịch thu tiền và hoàn trả thủ công. Tra cứu nợ hiện tại và lịch sử giao dịch.

**Phụ thuộc:**
- **Student Service** *(sync)* — resolve `student_id`, lấy enrollment hiện tại để biết mức học phí.
- **Class Service** *(sync)* — lấy `fee_per_session` snapshot tại thời điểm tạo `fee_record`.

**Lắng nghe event:**
- `attendance.upserted` → tạo hoặc huỷ `fee_record`.
- `session.cancelled` → huỷ toàn bộ `fee_records` của session đó.

**Được gọi bởi:** Student Service *(lấy số dư khi đuổi học)*, Reporting Service.

---

### 6. Topic Service

**Owns:** `topics`, `topic_standings`

**Trách nhiệm:** Quản lý chuyên đề (nhận link GYM, pull thời gian hết hiệu lực). Tự động pull standing từ Codeforces API theo lịch định kỳ cho các chuyên đề còn hiệu lực.

**Phụ thuộc:**
- **Class Service** *(sync)* — resolve `class_id` khi thêm chuyên đề.
- **Student Service** *(sync)* — resolve `student_id` khi lưu standing.
- **Codeforces API** *(external)* — pull standing và thời gian hết hiệu lực.

---

### 7. Learning Profile Service

**Owns:** Không có bảng riêng — là read model thuần tuý.

**Trách nhiệm:** Tổng hợp dữ liệu từ Topic Service và Student Service, trình bày học lực theo góc nhìn từng học sinh — danh sách chuyên đề đã tham gia, số bài giải, tiến độ theo thời gian.

**Phụ thuộc:**
- **Topic Service** *(sync)* — đọc `topic_standings`.
- **Student Service** *(sync)* — resolve thông tin học sinh.

---

### 8. Messaging Service

**Owns:** `discord_messages`, `discord_message_recipients`

**Trách nhiệm:** Cho phép giáo viên soạn và gửi tin nhắn bulk tới nhiều học sinh qua bot Discord. Lưu lịch sử và trạng thái gửi từng người nhận.

**Phụ thuộc:**
- **Student Service** *(sync)* — resolve danh sách học sinh theo lớp hoặc chọn thủ công.
- **Discord Bot** *(external)* — thực thi việc gửi DM.

---

### 9. Reporting Service

**Owns:** Không có bảng riêng — là read model thuần tuý.

**Trách nhiệm:** Tổng hợp dữ liệu tài chính từ Finance Service, trình bày báo cáo thu nhập với các tuỳ chọn lọc linh hoạt (thời gian, lớp, bao gồm hoặc không bao gồm khoản chưa thu).

**Phụ thuộc:**
- **Finance Service** *(sync)* — đọc `fee_records` và `transactions`.
- **Class Service** *(sync)* — resolve danh sách lớp để lọc.

---

## Luồng sự kiện chính

```
Bot Discord
    │
    │ điểm danh
    ▼
Attendance Service
    │
    │ event: attendance.upserted
    ▼
Finance Service ──── tạo / huỷ fee_record
    ▲
    │ event: session.cancelled
Class Service
```
