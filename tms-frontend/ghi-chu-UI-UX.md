Vì một lần prompt UI/UX rất là tốn token, nên cần prompt thông minh hơn, do đó file này ghi chú lại các mục cần chỉnh sửa trên UI/UX hiện tại, để prompt một lần ăn luôn. 

- Tách phần tạo buổi học khỏi điểm danh, tách phần tạo lịch học với phần tạo lớp học, cần một phần trong đó có thể chỉnh sửa lịch học và thêm buổi học.
- Cột trạng thái ở trang Học sinh bị lỗi hiển thị
- Xoá trường "codeforces group id" vì không cần thiết
- Phần thông tin ở trang /student chỉ có Học sinh,	Lớp,	Trạng thái,	Số dư,	Thao tác, bổ sung endpoint /student/:studentID
- endpoint Codeforces đổi tên khác
- endpoint Discord đổi tên khác
- làm lại endpoint Discord theo file figma-discord.md
- làm lại endpoint codeforces theo file figma-topics.md
- hiển thị màu sắc ở endpoint /reports, /attendance bị lỗi