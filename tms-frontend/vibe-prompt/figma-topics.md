# Functional Spec — Trang Chuyên đề (`/topics`)

---

## Header

- Tiêu đề trang: "Chuyên đề"
- Subtitle: "Quản lý chuyên đề và theo dõi tiến độ"
- Button góc trên phải: **＋ Thêm chuyên đề**

---

## Bộ lọc

Dropdown lọc theo lớp — mặc định "Tất cả lớp". Khi chọn một lớp cụ thể, chỉ hiển thị chuyên đề thuộc lớp đó.

---

## Danh sách chuyên đề

Chia thành hai section:

### Chuyên đề đang mở

Các chuyên đề còn trong thời hạn hiệu lực (`expires_at > now`).

Mỗi card hiển thị:
- Tên chuyên đề
- Badge trạng thái: "Đang mở"
- Tên lớp
- Số ngày còn lại và ngày hết hạn cụ thể
- Link "Xem trên Codeforces" → mở GYM link ra tab mới
- Link "Xem standing" → navigate sang trang standing của chuyên đề đó

### Chuyên đề đã hết hạn

Các chuyên đề đã qua `expires_at`. Hiển thị tương tự nhưng badge là "Đã hết hạn", không có số ngày đếm ngược.

---

## Action: Thêm chuyên đề

Mở modal, giáo viên nhập:
- Chọn lớp
- Link GYM contest trên Codeforces

Sau khi submit, hệ thống tự động gọi Codeforces API để lấy tên chuyên đề và thời gian hết hiệu lực.

---

## Trang standing (`/topics/:id/standing`)

Hiển thị bảng standing của chuyên đề: mỗi hàng là một học sinh trong lớp, các cột là từng bài trong contest, kèm thời gian pull gần nhất.
