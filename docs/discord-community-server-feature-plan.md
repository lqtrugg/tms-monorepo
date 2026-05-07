# Discord Community Server Feature Plan

Tài liệu này mô tả kế hoạch cho feature Discord mới:

- mỗi giáo viên có một `server chung` chứa toàn bộ học sinh của giáo viên đó
- mỗi lớp vẫn có thể có `server riêng`
- bot dùng `server chung` làm điểm mặc định để:
  - gửi DM
  - gửi invite link
  - gửi thông báo học phí
  - gửi thông báo hệ thống

Tài liệu này **không phải kế hoạch implement ngay**. Đây là feature backlog sau khi refactor codebase về kiến trúc mới ổn định hơn.

## 1. Thứ tự ưu tiên

Thứ tự đúng:

1. Hoàn tất refactor kiến trúc backend theo [oop-driven-refactor-plan.md](/Users/lequangtrung123/Documents/tms-monorepo/docs/oop-driven-refactor-plan.md)
2. Ổn định lại module boundaries, composition root, presentation/application/infrastructure
3. Sau đó mới implement feature Discord community server này

Lý do:

- feature này chạm nhiều module: `messaging`, `enrollment`, `finance`, `identity`, frontend `Messaging`
- nếu implement ngay trên codebase nửa cũ nửa mới, coupling sẽ tăng mạnh
- logic `invite / kick / DM / reminder / sync status` sẽ tiếp tục bị nhét vào service procedural và khó dọn về sau

## 2. Mục tiêu sản phẩm

User goal:

- giáo viên không cần hiểu Discord API
- không cần biết `guild id`, `channel id`, `invite endpoint`, `bot permissions`
- chỉ cần:
  - kết nối bot
  - chọn server chung
  - gắn server lớp nếu có
  - bấm các action như:
    - `Gửi lời mời`
    - `Kick khỏi lớp`
    - `Nhắc học phí`
    - `Gửi DM`

System goal:

- `server chung` là điểm hiện diện Discord mặc định của toàn bộ học sinh
- `server lớp` chỉ phục vụ hoạt động theo lớp: voice attendance, channel notification, class-specific invite
- lifecycle của học sinh phải rõ:
  - vào server chung
  - vào server lớp
  - rời server lớp khi transfer/withdraw/archive
  - có hoặc không giữ lại ở server chung tùy policy

## 3. Non-goals cho phase đầu

Phase đầu không làm:

- multi-bot orchestration phức tạp
- workflow Discord permission wizard
- full event bus phân tán
- analytics nâng cao cho DM delivery
- scheduling phức tạp theo cron UI

Phase đầu chỉ cần:

- setup được server chung
- mời học sinh vào server chung
- gửi DM dựa trên server chung
- gửi nhắc học phí theo template
- giữ được UX đơn giản

## 4. Mô hình nghiệp vụ đích

## 4.1. Khái niệm mới

Thêm khái niệm:

### `TeacherCommunityServer`

Một server Discord chung cấp giáo viên.

Gợi ý fields:

```txt
id
teacher_id
discord_server_id
name
bot_token
notification_channel_id nullable
invite_channel_id nullable
created_at
updated_at
```

Rule:

- một giáo viên có tối đa một community server active
- bot token mặc định nên attach tại đây

### `ClassDiscordServerBinding`

Đại diện cho server Discord riêng của từng lớp.

Khái niệm hiện tại `DiscordServer` đang mang cả meaning:

- server của lớp
- bot credential
- guild metadata

Khi implement feature mới, nên tách nghĩa:

- `TeacherCommunityServer` = teacher scope
- `ClassDiscordServerBinding` = class scope

## 4.2. Membership concept

Về nghiệp vụ, student có 2 trạng thái membership độc lập:

- community membership
- class membership

Ví dụ:

```txt
community:
  unknown | invited | joined | left | failed

class:
  unknown | invited | joined | left | failed
```

Phase đầu chưa bắt buộc phải materialize thành entity riêng, nhưng kế hoạch nên chừa chỗ cho việc đó.

## 5. Rule nghiệp vụ cần chốt trước khi code

Đây là các rule bắt buộc phải chốt rõ trước khi implement:

### Rule 1. Community server là mặc định cho DM

- nếu có `community server`, DM mặc định đi qua community context
- nếu chưa có `community server`, fallback về class server nếu flow đó vẫn cần chạy

### Rule 2. Transfer student

- kick khỏi class server cũ
- invite vào class server mới nếu lớp mới có server
- **không kick khỏi community server**

### Rule 3. Withdraw student

- kick khỏi class server hiện tại
- community server:
  - mặc định giữ nguyên
  - hoặc configurable policy nếu business muốn

### Rule 4. Archive student

Phải chốt một trong 2:

- archive vẫn giữ trong community server
- archive có option `kick khỏi community server`

### Rule 5. Bot token UX

Không yêu cầu user nhập token ở nhiều màn hình.

Khuyến nghị:

- community server giữ bot token mặc định
- class server có thể reuse bot token đó
- chỉ nhập token riêng khi dùng bot riêng

### Rule 6. Template message

User không phải tự soạn tất cả mọi tin nhắn.

Phase đầu nên có:

- `Mời vào server chung`
- `Mời vào lớp`
- `Nhắc học phí`
- `Thông báo chung`
- `Tin nhắn tùy chỉnh`

## 6. Kiến trúc backend target cho feature này

Feature này nên được implement sau khi `messaging` được kéo gần hơn với kiến trúc đích.

## 6.1. Module ownership

### `messaging`

Chịu trách nhiệm:

- setup Discord servers
- validate bot/server/channel
- send DM / channel post
- invite generation
- delivery log

### `enrollment`

Chịu trách nhiệm:

- trigger membership-related workflows khi student transfer/withdraw/reinstate/archive

### `finance`

Chịu trách nhiệm:

- cung cấp dữ liệu để build tuition reminder

### `identity`

Chịu trách nhiệm:

- teacher ownership / auth / permission

## 6.2. Backend use cases dự kiến

Sau khi `messaging` được refactor theo kiến trúc mới, feature này nên có các use case riêng:

```txt
messaging/application/commands/
  UpsertCommunityServerUseCase
  DeleteCommunityServerUseCase
  ValidateCommunityServerUseCase
  InviteStudentsToCommunityServerUseCase
  KickStudentsFromCommunityServerUseCase
  SendCommunityCustomDmUseCase
  SendTuitionReminderUseCase
  SendCommunityInviteReminderUseCase

messaging/application/queries/
  GetCommunityServerUseCase
  ListCommunityStudentStatusesUseCase
  ListMessagingTemplatesUseCase
```

## 6.3. Backend ports / adapters dự kiến

```txt
messaging/application/ports/
  DiscordGateway.ts
  InviteLinkGenerator.ts
  RecipientResolver.ts
  TuitionReminderDataPort.ts

messaging/infrastructure/persistence/typeorm/
  TeacherCommunityServerOrmEntity.ts
  TypeOrmTeacherCommunityServerRepository.ts
  TypeOrmMessagingLogRepository.ts

messaging/infrastructure/integrations/discord/
  DiscordGatewayAdapter.ts
  DiscordInviteLinkGeneratorAdapter.ts
  DiscordRecipientResolverAdapter.ts
```

## 6.4. Backend API contract dự kiến

### Community server setup

```txt
GET    /discord/community-server
PUT    /discord/community-server
DELETE /discord/community-server
POST   /discord/community-server/validate
```

### Community membership actions

```txt
POST /discord/community-server/invite/students
POST /discord/community-server/kick/students
GET  /discord/community-server/students/status
```

### Community messaging

```txt
POST /discord/community-server/messages/custom-dm
POST /discord/community-server/messages/tuition-reminder
POST /discord/community-server/messages/invite-reminder
```

### Class server binding

Class server APIs hiện có có thể giữ lại, nhưng nên refactor dần sang naming rõ hơn:

```txt
GET    /discord/class-servers
PUT    /classes/:classId/discord-server
DELETE /classes/:classId/discord-server
```

## 7. Frontend plan

Frontend hiện đã có [Messaging.tsx](/Users/lequangtrung123/Documents/tms-monorepo/tms-frontend/src/app/pages/Messaging.tsx). Đây là entry point đúng để mở rộng, không nên tạo một page hoàn toàn mới nếu chưa cần.

## 7.1. UX principles

Mục tiêu UX:

- ít bước
- nhiều default hợp lý
- có validate trước khi save
- có preview trước khi send
- lỗi phải dịch sang ngôn ngữ nghiệp vụ

User không nên thấy:

- `guild`
- `snowflake`
- `403 missing permissions`

User nên thấy:

- `Server chung`
- `Server lớp`
- `Bot đã kết nối`
- `Kênh dùng để mời`
- `Kênh dùng để thông báo`
- `Học sinh chưa vào Discord`
- `Gửi lời mời thất bại vì bot chưa thấy user`

## 7.2. Cấu trúc UI đề xuất

### Tab 1. `Server chung`

Chức năng:

- kết nối community server
- kiểm tra bot token
- chọn kênh thông báo
- chọn kênh để tạo invite
- xem trạng thái kết nối

Hiển thị:

- tên server
- trạng thái bot
- kênh thông báo
- kênh tạo invite
- số học sinh:
  - thiếu discord username
  - chưa mời
  - mời lỗi
  - có thể DM

Actions:

- `Kết nối server chung`
- `Kiểm tra kết nối`
- `Lưu cấu hình`
- `Gửi lời mời cho cả lớp`
- `Gửi lời mời cho học sinh chưa tham gia`

### Tab 2. `Server lớp`

Chức năng:

- map lớp sang server riêng
- cấu hình voice channel / notification channel

Hiển thị theo table:

- lớp
- server riêng
- bot đang dùng:
  - `bot server chung`
  - `bot riêng`
- trạng thái

Actions:

- `Gắn server`
- `Chỉnh sửa`
- `Gỡ`

### Tab 3. `Học sinh & Discord`

Chức năng:

- nhìn trạng thái Discord của học sinh
- bulk invite / bulk DM / bulk reminder

Hiển thị:

- học sinh
- lớp
- discord username
- trạng thái server chung
- trạng thái server lớp
- lỗi gần nhất

Bulk actions:

- `Mời vào server chung`
- `Mời vào server lớp`
- `Nhắc học phí`
- `Nhắc hoàn thành topic`
- `Nhắc vắng buổi gần nhất`

### Tab 4. `Tin nhắn`

Chức năng:

- gửi DM hoặc channel post
- dùng template thay vì soạn tay từ đầu

Modes:

- `DM học sinh`
- `Thông báo server chung`
- `Thông báo server lớp`

Templates phase đầu:

- `Mời vào server chung`
- `Mời vào lớp`
- `Nhắc học phí`
- `Thông báo chung`
- `Tùy chỉnh`

## 7.3. UX details bắt buộc

### 1. Chấp nhận link, không ép ID thô

UI input nên ghi:

- `Link server hoặc Server ID`
- `Link kênh hoặc Channel ID`

Backend đã có parser từ URL/text, nên tận dụng để giảm friction.

### 2. Có nút `Kiểm tra`

Trước khi save, user phải bấm kiểm tra để biết:

- bot token có hợp lệ không
- bot đã ở trong server chưa
- channel có thuộc server không
- bot thiếu quyền gì

### 3. Error message phải business-friendly

Ví dụ map lỗi:

- `Bot chưa được thêm vào server`
- `Bot chưa có quyền tạo invite ở kênh này`
- `Không tìm thấy kênh trong server đã chọn`
- `Không thể nhắn tin cho học sinh này vì bot chưa resolve được Discord account`

### 4. Preview trước khi send

Trước khi gửi hàng loạt, UI phải cho thấy:

- số người nhận
- số người thiếu discord username
- số người có khả năng fail
- nội dung preview

## 8. Data / persistence changes dự kiến

## 8.1. Bảng mới

### `teacher_community_servers`

```txt
id
teacher_id unique
discord_server_id
name
bot_token
notification_channel_id nullable
invite_channel_id nullable
created_at
updated_at
```

## 8.2. Bảng phase 2

Nếu cần tracking tốt hơn:

### `student_discord_memberships`

```txt
id
student_id
teacher_id
community_status
class_status
last_invited_at
last_dm_at
last_sync_at
last_error
created_at
updated_at
```

Không bắt buộc cho phase đầu, nhưng rất hữu ích cho vận hành.

## 9. Migration strategy

Không thay toàn bộ hệ thống Discord trong một lần.

## Phase 0. Refactor prerequisite

Hoàn tất trước:

- refactor `messaging` khỏi service procedural lớn
- chuẩn hóa controller/use-case/adapter structure
- làm rõ boundary giữa `messaging`, `enrollment`, `finance`

## Phase 1. Community server foundation

- thêm entity `teacher_community_servers`
- thêm setup API
- thêm validate API
- thêm UI tab `Server chung`

## Phase 2. Community invite & DM

- mời học sinh vào server chung
- custom DM qua community server
- UI bulk actions cơ bản

## Phase 3. Tuition reminder

- template `Nhắc học phí`
- query finance data
- preview số nợ trước khi send

## Phase 4. Enrollment integration

- transfer:
  - kick class server cũ
  - invite class server mới
- giữ community membership theo policy

## Phase 5. Membership observability

- status table cho student Discord
- last error
- retry failed invite / DM

## 10. Rủi ro chính

### 1. DM chỉ hoạt động khi bot resolve được recipient

Nếu bot và học sinh không có shared guild context, DM có thể fail.

Đây là lý do community server là thiết kế đúng.

### 2. Bot permission mismatch

Nếu user tự paste token/server/channel sai, failure rate sẽ cao.

Do đó:

- validate trước khi save là bắt buộc
- error message phải rõ

### 3. Coupling giữa enrollment và messaging

Nếu implement vội, logic `kick / invite` sẽ quay lại nhét trong controller/service.

Phải đi qua use case/port rõ ràng sau refactor.

### 4. Restore/fallback complexity

Nhiều flow cần fallback:

- có community server nhưng không có class server
- có class server nhưng chưa có community server
- bot token chung hay bot token riêng

Phase đầu cần giữ rule đơn giản.

## 11. Definition of done cho feature này

Feature này chỉ được coi là done khi:

- giáo viên setup được server chung mà không cần hiểu Discord API
- có validate bot/server/channel trước khi save
- có thể mời học sinh vào server chung bằng 1 action rõ ràng
- có thể gửi DM hàng loạt từ community server context
- có template `nhắc học phí`
- UI hiển thị học sinh nào fail vì thiếu discord username hoặc resolve thất bại
- transfer student không kick khỏi community server ngoài ý muốn
- class server và community server có boundary rõ ràng trong code

## 12. Kết luận

Feature này nên làm, nhưng **không phải việc kế tiếp**.

Việc kế tiếp vẫn là:

- hoàn tất refactor codebase cho bám kiến trúc mới
- đặc biệt là các module `messaging`, `identity`, `classroom`, `finance`

Sau khi kiến trúc ổn hơn, feature Discord community server này sẽ dễ implement hơn, ít procedural residue hơn, và UX cũng sẽ bền hơn thay vì vá chỗ này thủng chỗ kia.
