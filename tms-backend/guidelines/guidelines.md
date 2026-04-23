LLM ATTENTION!! Đây là những rule trong project này mày cần tuân theo:

- .env đã chứa mọi biến môi trường cần thiêt, nếu chưa có thì có nghĩa hệ thống không cần.
- Mỗi biến theo một format nhất định, xuyên suốt, không cần xét nhiều trường hợp mang cùng ý nghĩa ( như yes-no và 0-1 )
- Không dùng database.url để kết nối với database
- Hiện tại database sẽ tự reset mỗi khi khởi động lại để thuận tiện code, sẽ sửa lại sau
- Frontend chỉ gọi `/api/...`; Vite proxy chỉ dùng lúc dev để forward sang backend service trong Docker
- Các hàm normalize, serialize như toAuthTeacher, normalizeCredentials thì centralize trong helpers, ví dụ auth.helpers.ts
- Các khai báo types thì centralize trong types, ví dụ auth.types.ts