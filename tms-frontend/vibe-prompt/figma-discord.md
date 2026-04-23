# Functional Spec — Trang Discord

---

### Tab bar

Full width, hai tab:
- **Discord Servers**
- **Lịch sử tin nhắn**

---

## Tab: Discord Servers

### Danh sách server

Mỗi server tương ứng với một lớp học. Hiển thị:
- Tên server
- Server ID
- Số kênh
- Số thành viên

**Thêm server** → mở modal, giáo viên nhập Server ID để liên kết với một lớp.

**Cấu hình bot** → mở modal, giáo viên thiết lập:
- Voice channel bot theo dõi để điểm danh tự động: khi buổi học bắt đầu, bot liên tục poll Discord API lấy danh sách thành viên đang có mặt trong channel này.
- Text channel bot dùng để post thông báo tự động: hệ thống tự trigger các thông báo (nhắc học phí, nhắc làm bài, thông báo lịch học…) vào channel này dựa theo sự kiện, không cần giáo viên soạn thủ công.

**Xem channels** → hiển thị danh sách kênh hiện có của server (lấy từ Discord API).

### Empty state

Khi chưa có server nào: hiển thị hướng dẫn các bước kết nối, kèm nút CTA thêm server đầu tiên.

---

## Tab: Lịch sử tin nhắn

Ghi lại tất cả tin nhắn đã gửi qua bot — bao gồm cả thông báo tự động của hệ thống lẫn tin nhắn thủ công của giáo viên.

Giáo viên có thể lọc theo loại:
- **Tất cả**
- **Thông báo tự động** — do hệ thống trigger theo sự kiện
- **Channel chung** — giáo viên gửi broadcast thủ công vào text channel
- **Bulk DM** — giáo viên gửi DM thủ công tới từng học sinh

Mỗi item hiển thị:
- Thời gian gửi
- Loại (badge phân biệt rõ ba loại trên)
- Nội dung (preview, truncate nếu dài)
- Với bulk DM: tổng số người nhận, số gửi thành công, số gửi thất bại

Click vào một item bulk DM → xem chi tiết trạng thái `sent / failed` của từng học sinh, kèm lý do thất bại nếu có.

Click vào item channel chung hoặc thông báo tự động → xem nội dung đầy đủ và server / channel đã gửi vào.

---

## Action: Gửi tin nhắn (button góc trên phải)

Giáo viên chọn một trong hai loại:

### Loại 1 — Gửi vào channel chung

- Chọn một hoặc nhiều server muốn gửi vào.
- Soạn nội dung.
- Xác nhận → bot post vào text channel đã cấu hình của từng server được chọn.

### Loại 2 — Bulk DM

Gồm ba bước:

**Bước 1 — Chọn người nhận:**
- Lọc nhanh theo lớp → tự động chọn toàn bộ học sinh của lớp đó.
- Hoặc chọn thủ công từng học sinh.
- Hiển thị số lượng người nhận đã chọn.

**Bước 2 — Soạn nội dung:**
- Text area nhập nội dung tin nhắn.
- Preview số người sẽ nhận.

**Bước 3 — Xác nhận và gửi:**
- Tóm tắt: số người nhận, nội dung.
- Nút gửi → bot gửi DM riêng tới từng người.
- Kết quả xuất hiện ngay trong tab Lịch sử tin nhắn.
