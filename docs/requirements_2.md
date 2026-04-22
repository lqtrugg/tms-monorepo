# Phân tích yêu cầu chức năng — Nghiệp vụ dạy lập trình thi đấu

---

## 1. Xác thực

Mỗi giáo viên có tài khoản riêng với dữ liệu hoàn toàn độc lập. Mọi xung đột khi nhiều người dùng đồng thời được giải quyết ngoài hệ thống.

| Thao tác | Mô tả |
|----------|-------|
| Đăng ký | Tạo tài khoản giáo viên mới |
| Đăng nhập | Xác thực và mở session làm việc |
| Đăng xuất | Kết thúc session |

---

## 2. Quản lý học sinh

Học sinh có ba trạng thái: `active` → `pending_archive` → `archived`.

Học sinh `archived` vẫn tra cứu được trong lịch sử giao dịch và lịch sử buổi học, nhưng không xuất hiện trong tra cứu nợ hiện tại.

| Thao tác | Mô tả |
|----------|-------|
| Thêm học sinh | Tạo hồ sơ học sinh mới, xếp vào lớp. Học sinh nhập học giữa chừng không ảnh hưởng nghiệp vụ học phí vì học phí tính theo từng buổi thực tế |
| Chuyển lớp | Đóng enrollment hiện tại, mở enrollment mới cho lớp mới. Học phí theo mức lớp mới có hiệu lực từ buổi đầu tiên sau thời điểm chuyển. Giáo viên cập nhật thành viên Codeforces group của cả hai lớp thủ công |
| Đuổi học | Chuyển học sinh sang `pending_archive`. Nếu còn nợ → đưa vào danh sách *cần đòi*; nếu dư tiền → đưa vào danh sách *cần trả*; nếu không nợ không dư → `archived` luôn |
| Archive học sinh | Giáo viên xác nhận thủ công sau khi đã xử lý xong tài chính tồn đọng (đòi nợ hoặc hoàn trả), chuyển trạng thái sang `archived` |
| Xem danh sách học sinh | Lọc theo trạng thái (`active` / `pending_archive` / `archived`) |
| Xem danh sách cần đòi / cần trả | Danh sách riêng các học sinh `pending_archive`, không lẫn vào danh sách tra cứu nợ active |

---

## 3. Quản lý lớp và lịch dạy

| Thao tác | Mô tả |
|----------|-------|
| Tạo lớp | Tạo lớp mới với tên và mức học phí theo buổi |
| Cập nhật học phí lớp | Thay đổi chỉ áp dụng từ buổi tiếp theo, không retroactive |
| Thiết lập lịch recurring | Cấu hình các slot trong tuần cho lớp, kèm ngày bắt đầu và kết thúc hiệu lực. Hệ thống auto-generate các buổi học từ lịch này |
| Đóng lớp | Chuyển lớp sang `archived`. Học phí đã phát sinh vẫn còn hiệu lực. Codeforces group không bị tác động |
| Xem danh sách lớp | Lọc theo trạng thái (`active` / `archived`) |

---

## 4. Quản lý buổi học

| Thao tác | Mô tả |
|----------|-------|
| Xem lịch buổi học | Xem các buổi học đã được auto-generate hoặc thêm thủ công theo lớp và thời gian |
| Thêm buổi học thủ công | Thêm buổi ngoài lịch recurring |
| Huỷ buổi học | Chuyển buổi sang `cancelled`. Toàn bộ `fee_records` gắn với buổi đó bị huỷ theo; bản ghi điểm danh giữ nguyên để lưu lịch sử |

---

## 5. Điểm danh

| Thao tác | Mô tả |
|----------|-------|
| Nhận điểm danh tự động | Bot Discord đẩy dữ liệu điểm danh vào hệ thống sau mỗi buổi học |
| Override điểm danh thủ công | Giáo viên sửa trạng thái điểm danh khi bot gặp sự cố hoặc học sinh không qua Discord |
| Approve nghỉ có lí do | Giáo viên xác nhận lí do nghỉ (học sinh báo qua Discord), cập nhật bản ghi điểm danh sang `absent_excused` và huỷ `fee_record` tương ứng |

---

## 6. Học phí và giao dịch tài chính

Quy tắc phát sinh học phí theo từng buổi:

| Trạng thái điểm danh | Phát sinh học phí? |
|----------------------|--------------------|
| Có mặt (`present`) | ✅ |
| Nghỉ không lí do (`absent_unexcused`) | ✅ |
| Nghỉ có lí do (`absent_excused`) | ❌ |
| Buổi học bị huỷ | ❌ |

| Thao tác | Mô tả |
|----------|-------|
| Ghi nhận giao dịch thu tiền | Sau khi thu tiền qua kênh bất kỳ, giáo viên ghi lại giao dịch thủ công vào hệ thống |
| Ghi nhận giao dịch hoàn trả | Khi hoàn tiền cho học sinh bị đuổi có số dư dương, giáo viên ghi lại giao dịch hoàn trả (khoản âm, làm giảm doanh thu ròng) |
| Tra cứu nợ hiện tại | Xem số dư (nợ / dư) theo từng học sinh `active` |
| Tra cứu lịch sử giao dịch | Xem toàn bộ giao dịch theo từng học sinh, bao gồm cả học sinh `archived` |

---

## 7. Codeforces và chuyên đề

Mỗi lớp đang mở tương ứng với một Codeforces group. Chuyên đề được tạo dưới dạng contest GYM trong group, bài tập được thêm thủ công trên Codeforces.

| Thao tác | Mô tả |
|----------|-------|
| Liên kết Codeforces group với lớp | Giáo viên nhập URL group để liên kết với lớp tương ứng trong hệ thống |
| Thêm chuyên đề | Giáo viên cung cấp link GYM; hệ thống tự động lấy thời gian hết hiệu lực qua Codeforces API |
| Auto-pull standing | Hệ thống tự động pull dữ liệu standing từ Codeforces API theo lịch định kỳ (mặc định mỗi giờ, có thể cấu hình) cho các chuyên đề còn hiệu lực |

---

## 8. Hồ sơ học lực

Mỗi học sinh có một hồ sơ học lực riêng, tổng hợp từ dữ liệu standing đã pull về.

| Thao tác | Mô tả |
|----------|-------|
| Xem hồ sơ học lực | Xem toàn bộ các chuyên đề một học sinh đã tham gia, số bài đã giải trên từng chuyên đề, và tiến độ theo thời gian |

---

## 9. Giao tiếp qua Discord

Discord là kênh giao tiếp chính với học sinh: dạy online, trao đổi và giải đáp bài tập. Bot Discord cũng là kênh để gửi các thông báo tự động.

| Thao tác | Mô tả |
|----------|-------|
| Gửi tin nhắn bulk | Giáo viên soạn nội dung, chọn danh sách người nhận (lọc theo lớp hoặc chọn thủ công), hệ thống nhờ bot gửi DM riêng tới từng học sinh trên Discord |
| Xem lịch sử tin nhắn đã gửi | Xem lại nội dung và danh sách người nhận của các lần gửi trước |
| Xem trạng thái gửi | Xem trạng thái gửi thành công / thất bại của từng người nhận trong một lần gửi |

---

## 10. Báo cáo thống kê

| Thao tác | Mô tả |
|----------|-------|
| Xem báo cáo thu nhập | Lọc theo khoảng thời gian tự chọn, danh sách lớp tự chọn, và tuỳ chọn bao gồm hoặc không bao gồm khoản chưa thu. Khoản chưa thu bao gồm cả nợ của học sinh `pending_archive` ở trạng thái *cần đòi*. UI hiển thị đầy đủ tất cả tuỳ chọn lọc |
