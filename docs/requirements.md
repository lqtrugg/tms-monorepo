# Phân tích yêu cầu chức năng — Nghiệp vụ dạy lập trình thi đấu

---

### 1. Xác thực

Giáo viên cần đăng ký và đăng nhập vào hệ thống. Mỗi giáo viên có dữ liệu hoàn toàn độc lập với nhau. Mọi xung đột nghiệp vụ khi nhiều người dùng đồng thời (ví dụ hai người cùng approve một lí do nghỉ) được giải quyết ngoài hệ thống.

---

### 2. Quản lý học sinh

**Trạng thái học sinh** gồm ba mức: `active`, `pending_archive`, và `archived`.

**Nhập học:** Giáo viên thêm học sinh mới vào hệ thống và xếp vào lớp. Học sinh nhập học giữa chừng vẫn được tham gia Codeforces group bình thường; học phí tính theo từng buổi thực tế nên không có vấn đề nghiệp vụ.

**Chuyển lớp:** Học sinh vẫn ở trạng thái `active`, phải trả toàn bộ số nợ hiện tại của lớp cũ. Học phí mỗi buổi có hiệu lực từ buổi học đầu tiên sau thời điểm chuyển lớp sẽ tính theo mức của lớp mới. Giáo viên cập nhật thành viên Codeforces group của cả hai lớp thủ công.

**Đuổi học:** Tuỳ theo số dư, học sinh bị đưa vào trạng thái `pending_archive` và được theo dõi riêng trong một danh sách chuyên biệt, không xuất hiện trong tra cứu nợ active:
- **Còn nợ** → đưa vào mục *cần đòi*. Sau khi thu đủ nợ, giáo viên cập nhật thủ công sang `archived`. Khoản thu này được ghi nhận là giao dịch thu tiền thông thường.
- **Dư tiền** → đưa vào mục *cần trả*. Sau khi hoàn trả cho học sinh, giáo viên cập nhật thủ công sang `archived`. Khoản này được ghi nhận là giao dịch hoàn trả (khoản âm, làm giảm doanh thu ròng trong báo cáo).
- **Không nợ, không dư** → chuyển thẳng sang `archived`.

**Tra cứu học sinh đã archived:** Học sinh `archived` vẫn có thể tra cứu trong lịch sử giao dịch và lịch sử buổi học, nhưng không xuất hiện trong tra cứu nợ hiện tại.

---

### 3. Quản lý lớp và lịch dạy

Giáo viên quản lý danh sách các lớp đang mở, mỗi lớp có lịch dạy recurring và mức học phí cố định theo buổi. Khi thay đổi mức học phí của một lớp, thay đổi chỉ áp dụng từ buổi tiếp theo trở đi, không ảnh hưởng các buổi đã phát sinh.

Khi đóng lớp, lớp chuyển sang trạng thái archived. Các bản ghi học phí liên quan vẫn còn hiệu lực. Codeforces group tương ứng không bị tác động, giáo viên để nguyên.

---

### 4. Buổi học và điểm danh

Buổi học được auto-generate từ lịch recurring khi thiết lập lớp. Giáo viên có thể thêm buổi ngoài lịch hoặc huỷ từng buổi đơn lẻ. Khi một buổi học bị huỷ, các bản ghi học phí gắn với buổi đó bị huỷ theo; bản ghi điểm danh được giữ nguyên để lưu lịch sử.

Điểm danh được thực hiện tự động qua bot Discord, bot đẩy dữ liệu vào hệ thống. Nếu bot gặp sự cố hoặc học sinh không qua Discord, giáo viên có thể override điểm danh thủ công.

Học sinh báo nghỉ có lí do qua Discord. Giáo viên approve trong hệ thống và sửa bản ghi điểm danh / học phí tương ứng thủ công.

---

### 5. Học phí và giao dịch tài chính

Học phí tính theo từng buổi học:
- Tham gia học → bị tính phí theo lớp đang học.
- Nghỉ không có lí do → vẫn bị tính phí.
- Nghỉ có lí do (giáo viên đã approve) → không tính phí.
- Buổi học bị giáo viên huỷ → không tính phí.

Quy trình thu tiền thực hiện hoàn toàn thủ công. Giáo viên thu tiền qua kênh bất kỳ rồi ghi lại giao dịch vào hệ thống.

Giáo viên có thể tra cứu:
- **Lịch sử giao dịch** theo từng học sinh, bao gồm cả học sinh `archived`.
- **Nợ hiện tại** theo từng học sinh `active` (không tra cứu học sinh `archived` hay `pending_archive`).

---

### 6. Codeforces và chuyên đề

Mỗi lớp đang mở tương ứng với một Codeforces group. Giáo viên tạo group, thêm/xoá thành viên thủ công theo danh sách lớp. Chuyên đề được tạo dưới dạng contest GYM trong group; bài tập được thêm vào thủ công.

Khi thêm một chuyên đề, hệ thống yêu cầu link GYM và tự động lấy thời gian hết hiệu lực qua Codeforces API. Với các chuyên đề còn hiệu lực, hệ thống tự động pull dữ liệu standing từ Codeforces API theo lịch định kỳ (mặc định mỗi giờ, có thể cấu hình), giúp giáo viên theo dõi số bài đã giải của từng học sinh qua mỗi chuyên đề.

---

### 7. Discord

Discord là kênh giao tiếp chính với học sinh: dạy online, trao đổi và giải đáp bài tập. Bot Discord gửi thông báo tự động (đóng học phí, nhắc làm bài, thông báo nghỉ học…) tới cá nhân hoặc nhóm chat chung tuỳ ngữ cảnh.

---

### 8. Báo cáo thống kê

Giáo viên có thể xem báo cáo thu nhập (đơn vị VNĐ) với các tuỳ chọn lọc linh hoạt:
- Khoảng thời gian tự chọn.
- Danh sách lớp tự chọn.
- Bao gồm hoặc không bao gồm khoản chưa thu (khoản chưa thu bao gồm cả nợ của học sinh `pending_archive` ở trạng thái *cần đòi*).

Giao dịch hoàn trả (học sinh bị đuổi khi dư tiền) được tính là khoản âm và làm giảm doanh thu ròng trong báo cáo. UI cần hiển thị đầy đủ tất cả tuỳ chọn lọc.
