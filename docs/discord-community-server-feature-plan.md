# Discord Community Server Feature Plan

Tài liệu này mô tả kế hoạch cho feature Discord mới:

- mỗi giáo viên có một `server chung` chứa toàn bộ học sinh của giáo viên đó
- mỗi lớp vẫn có thể có `server riêng`
- bot dùng `server chung` làm điểm mặc định để:
  - gửi DM
  - gửi invite link
  - gửi thông báo học phí
  - gửi thông báo hệ thống

## 1. Mục tiêu sản phẩm

User goal:

- giáo viên không cần hiểu Discord API
- không cần biết `guild id`, `channel id`, `invite endpoint`, `bot permissions`
- chỉ cần:
  - nhận `link mời bot` từ admin hệ thống
  - tự add bot đó vào server Discord của mình
  - vào app và bấm `Đồng bộ server`
  - chọn `server chung` từ danh sách server đã sync
  - chọn `server lớp` từ danh sách server đã sync nếu cần
  - chọn 1 `text channel` và 1 `voice channel` tương ứng
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

## 2. Onboarding flow cho giáo viên

Flow mong muốn:

1. sysadmin cấu hình bot credential trong UI quản trị của hệ thống
2. hệ thống generate `invite link` từ bot đó
3. sysadmin gửi cho giáo viên `invite link`
4. giáo viên tự mở link đó và add bot vào:
   - server chung của mình
   - các server lớp nếu có
5. trong app, giáo viên chỉ cần:
   - bấm `Đồng bộ server Discord`
   - chọn `server chung` từ danh sách server đã sync
   - chọn `server lớp` từ danh sách server đã sync
   - chọn `text channel`
   - chọn `voice channel`
   - bấm `Lưu`

Nguyên tắc:

- app không yêu cầu giáo viên tự tạo bot
- app không yêu cầu giáo viên tự lấy bot token từ Discord Developer Portal
- bot credential nằm trong phạm vi quản trị `sysadmin`, không expose cho giáo viên
- app không yêu cầu giáo viên paste `server id`, `channel id`, hay `bot token`
- app phải tự sync danh sách `discord servers` và `channels` sau khi bot đã được giáo viên add vào server

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
notification_channel_id nullable
invite_channel_id nullable
created_at
updated_at
```

Rule:

- một giáo viên có tối đa một community server active
- bot identity là bot chung do hệ thống cấp
- bot credential thuộc ownership của `sysadmin`
- giáo viên không tự quản lý bot token trong UI

### `ClassDiscordServerBinding`

Đại diện cho server Discord riêng của từng lớp.

Khái niệm hiện tại `DiscordServer` đang mang cả meaning:

- server của lớp
- bot installation/binding
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

### Rule 5. Bot UX

Không yêu cầu user nhập token ở bất kỳ màn hình nào.

Khuyến nghị:

- bot credential được cấu hình trong UI của `sysadmin`
- giáo viên chỉ add bot bằng invite link
- UI chỉ cho giáo viên chọn server và channel từ danh sách đã sync
- mọi validate đều dựa trên bot đã được giáo viên add vào server qua invite link của admin
- không còn use case `giáo viên tự add discord server bằng tay` trong app

### Rule 6. Template message

User không phải tự soạn tất cả mọi tin nhắn.

Phase đầu nên có:

- `Mời vào server chung`
- `Mời vào lớp`
- `Nhắc học phí`
- `Thông báo chung`
- `Tin nhắn tùy chỉnh`

## 6. Kiến trúc backend target cho feature này

## 6.1. Module ownership

### `messaging`

Chịu trách nhiệm:

- đồng bộ danh sách Discord servers mà bot đang thấy theo từng giáo viên
- đồng bộ danh sách channels / voice channels của từng server
- binding `server chung` và `server lớp` dựa trên dữ liệu đã sync
- validate bot/server/channel
- send DM / channel post
- invite generation
- delivery log
- giữ mapping giữa teacher/class và các Discord server mà bot đã được add vào

### `enrollment`

Chịu trách nhiệm:

- trigger membership-related workflows khi student transfer/withdraw/reinstate/archive

### `finance`

Chịu trách nhiệm:

- cung cấp dữ liệu để build tuition reminder

### `identity`

Chịu trách nhiệm:

- teacher ownership / auth / permission
- sysadmin-owned bot credential
- sysadmin UI để cấu hình bot credential
- invite link distribution

## 6.2. Backend use cases dự kiến

```txt
messaging/application/commands/
  SyncTeacherDiscordServersUseCase
  SelectCommunityServerUseCase
  BindClassDiscordServerUseCase
  UnbindClassDiscordServerUseCase
  InviteStudentsToCommunityServerUseCase
  KickStudentsFromCommunityServerUseCase
  SendCommunityCustomDmUseCase
  SendTuitionReminderUseCase
  SendCommunityInviteReminderUseCase

messaging/application/queries/
  GetDiscordWorkspaceStatusUseCase
  ListTeacherDiscordServersUseCase
  ListTeacherDiscordChannelsUseCase
  ListCommunityStudentStatusesUseCase
  ListMessagingTemplatesUseCase

identity/application/commands/
  UpsertSysadminDiscordBotCredentialUseCase

identity/application/queries/
  GetSysadminDiscordBotCredentialUseCase
```

## 6.3. Backend ports / adapters dự kiến

```txt
messaging/application/ports/
  DiscordGateway.ts
  RecipientResolver.ts
  TuitionReminderDataPort.ts
  SysadminBotCredentialPort.ts

messaging/infrastructure/persistence/typeorm/
  TeacherCommunityServerOrmEntity.ts
  TeacherDiscordServerCacheOrmEntity.ts
  TeacherDiscordChannelCacheOrmEntity.ts
  TypeOrmTeacherCommunityServerRepository.ts
  TypeOrmTeacherDiscordServerCacheRepository.ts
  TypeOrmTeacherDiscordChannelCacheRepository.ts
  TypeOrmMessagingLogRepository.ts

messaging/infrastructure/integrations/discord/
  DiscordGatewayAdapter.ts
  DiscordRecipientResolverAdapter.ts

identity/infrastructure/persistence/typeorm/
  SysadminDiscordBotCredentialOrmEntity.ts

identity/presentation/routes/
  sysadmin-discord-bot.routes.ts
```

## 6.4. Backend API contract dự kiến

### Community server setup

```txt
GET    /discord/bot-invite-link
GET    /discord/community-server
PUT    /discord/community-server/select
POST   /discord/servers/sync
GET    /discord/servers
GET    /discord/servers/:serverId/channels
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

Teacher không tự nhập server nữa. Teacher chọn class server từ danh sách server đã sync:

```txt
GET    /discord/class-servers
PUT    /classes/:classId/discord-server/select
DELETE /classes/:classId/discord-server
```

### Sysadmin bot config

```txt
GET  /admin/discord-bot
PUT  /admin/discord-bot
GET  /admin/discord-bot/invite-link
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
- không lộ bot credential ra UI
- phải chỉ ra rõ giáo viên đang thiếu bước nào để workflow chạy được

User không nên thấy:

- `guild`
- `snowflake`
- `403 missing permissions`

User nên thấy:

- `Link mời bot`
- `Bot đã được thêm vào server chưa`
- `Server chung`
- `Server lớp`
- `Danh sách server đã đồng bộ`
- `Danh sách text channel`
- `Danh sách voice channel`
- `Bot đã kết nối`
- `Text channel dùng để thông báo`
- `Voice channel dùng để điểm danh`
- `Học sinh chưa vào Discord`
- `Gửi lời mời thất bại vì bot chưa thấy user`
- `Việc cần làm tiếp theo`

### Nguyên tắc trạng thái vận hành

UI phải có một lớp trạng thái tổng quan, không bắt giáo viên tự suy luận từ nhiều tab.

Ít nhất phải chỉ ra được các tình huống:

- chưa có `server chung`
- bot chưa được add vào `server chung`
- `server chung` chưa chọn đủ `text channel` / `voice channel`
- còn học sinh active chưa vào `server chung`
- còn học sinh thiếu `discord_username`
- có lớp active chưa có `server lớp`
- có `server lớp` nhưng bot chưa được add vào đó
- có lời mời / DM / reminder gửi lỗi gần đây

Mỗi trạng thái phải đi kèm:

- mức độ ưu tiên: `cần làm ngay`, `nên làm`, `thông tin`
- mô tả ngắn, dễ hiểu
- CTA rõ ràng, ví dụ:
  - `Thiết lập server chung`
  - `Mở link mời bot`
  - `Chọn kênh invite`
  - `Mời 12 học sinh còn thiếu`
  - `Gắn server cho 3 lớp`
  - `Xem 5 lỗi gần nhất`

## 7.2. Cấu trúc UI đề xuất

### Dải trạng thái tổng quan ở đầu trang

Trang `Messaging` nên có một vùng đầu trang kiểu `Setup status / Next actions`.

Ví dụ các card hoặc checklist:

- `Chưa có server chung`
- `Server chung đã kết nối`
- `Còn 8 học sinh chưa tham gia server chung`
- `Có 2 lớp chưa gắn server riêng`
- `Có 3 lỗi gửi lời mời cần kiểm tra`

Mỗi item phải bấm được để dẫn user vào đúng tab / modal tương ứng.

Mục tiêu là:

- giáo viên mở trang lên là biết ngay hệ thống đang thiếu gì
- không phải tự vào từng tab để dò
- không phải đọc tài liệu để hiểu bước tiếp theo

### Tab 1. `Server chung`

Chức năng:

- hướng dẫn add bot vào server chung
- đồng bộ danh sách server Discord của giáo viên
- chọn community server từ danh sách server đã sync
- chọn `1 text channel`
- chọn `1 voice channel`
- xem trạng thái kết nối

Hiển thị:

- danh sách server đã sync
- tên server đang chọn
- trạng thái bot
- text channel đã chọn
- voice channel đã chọn
- trạng thái setup tổng quát:
  - `chưa cấu hình`
  - `đã cấu hình nhưng bot chưa ở trong server`
  - `thiếu channel`
  - `sẵn sàng`
- số học sinh:
  - thiếu discord username
  - chưa mời
  - mời lỗi
  - có thể DM

Actions:

- `Mở link mời bot`
- `Đồng bộ server Discord`
- `Chọn server chung`
- `Lưu cấu hình`
- `Gửi lời mời cho cả lớp`
- `Gửi lời mời cho học sinh chưa tham gia`

### Tab 2. `Server lớp`

Chức năng:

- map lớp sang server riêng từ danh sách server đã sync
- chọn `1 text channel` và `1 voice channel`

Hiển thị theo table:

- lớp
- server riêng
- text channel
- voice channel
- trạng thái

Trạng thái lớp nên phân biệt rõ:

- `chưa gắn server`
- `đã gắn nhưng bot chưa có trong server`
- `thiếu voice channel`
- `thiếu notification channel`
- `sẵn sàng`

Actions:

- `Mở link mời bot`
- `Đồng bộ server Discord`
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

Phải có filter nhanh cho các nhóm hành động:

- `Thiếu discord username`
- `Chưa ở server chung`
- `Chưa ở server lớp`
- `Lời mời lỗi`
- `Có thể nhắn tin`

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

### 1. Không bắt nhập ID thô

Teacher không nhập tay `server id` hay `channel id`.

UI phải cho:

- `Đồng bộ server Discord`
- chọn server từ dropdown/list
- chọn text channel từ dropdown/list
- chọn voice channel từ dropdown/list

### 2. Có nút `Đồng bộ` và `Kiểm tra`

Trước khi save, user phải thấy rõ:

- bot đã ở trong server chưa
- hệ thống đã sync được server chưa
- text channel có thuộc server không
- voice channel có thuộc server không
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

### 5. Empty state và warning state phải có hành động tiếp theo

Ví dụ:

- nếu chưa có `server chung`:
  - hiện empty state với CTA `Thiết lập server chung`
- nếu có server chung nhưng bot chưa được add:
  - hiện warning state với CTA `Mở link mời bot`
- nếu có server chung nhưng chưa đủ học sinh:
  - hiện warning state với CTA `Mời học sinh còn thiếu`
- nếu có lớp active chưa có server:
  - hiện warning state với CTA `Gắn server cho lớp`

## 8. Data / persistence changes dự kiến

## 8.1. Bảng mới

### `teacher_community_servers`

```txt
id
teacher_id unique
discord_server_id
name
notification_channel_id nullable
voice_channel_id nullable
created_at
updated_at
```

### `teacher_discord_server_caches`

```txt
id
teacher_id
discord_server_id
name
synced_at
```

### `teacher_discord_channel_caches`

```txt
id
teacher_id
discord_server_id
discord_channel_id
name
type text|voice
synced_at
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

## Phase 1. Community server foundation

- thêm entity `teacher_community_servers`
- thêm cache bảng `teacher_discord_server_caches`
- thêm cache bảng `teacher_discord_channel_caches`
- thêm sysadmin UI để cấu hình bot credential
- thêm endpoint `GET /discord/bot-invite-link`
- thêm `sync servers/channels` API
- thêm `select server/channel` API
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

Nếu giáo viên chưa add bot vào đúng server hoặc bot thiếu quyền, failure rate sẽ cao.

Do đó:

- validate trước khi save là bắt buộc
- error message phải rõ

### 3. Coupling giữa enrollment và messaging

Nếu implement vội, logic `kick / invite` sẽ quay lại nhét trong controller/service.

Phải đi qua use case/port rõ ràng.

### 4. Restore/fallback complexity

Nhiều flow cần fallback:

- có community server nhưng không có class server
- có class server nhưng chưa có community server
- bot đã được add ở server chung nhưng chưa được add ở server lớp

Phase đầu cần giữ rule đơn giản.

## 11. Definition of done cho feature này

Feature này chỉ được coi là done khi:

- giáo viên setup được server chung mà không cần hiểu Discord API hoặc Discord Developer Portal
- giáo viên chỉ cần dùng invite link bot do admin cung cấp để add bot vào server
- UI chỉ ra trực quan giáo viên đang thiếu bước nào:
  - chưa có server chung
  - chưa add bot
  - thiếu channel
  - thiếu học sinh trong server chung
  - lớp chưa có server
- có validate bot/server/channel trước khi save
- có thể mời học sinh vào server chung bằng 1 action rõ ràng
- có thể gửi DM hàng loạt từ community server context
- có template `nhắc học phí`
- UI hiển thị học sinh nào fail vì thiếu discord username hoặc resolve thất bại
- mọi warning/empty state chính đều có CTA dẫn tới hành động tiếp theo
- transfer student không kick khỏi community server ngoài ý muốn
- class server và community server có boundary rõ ràng trong code

## 12. Kết luận

Mục tiêu của plan này là làm cho Discord trở thành một workflow vận hành đơn giản:

- admin hệ thống quản lý bot
- bot credential do sysadmin quản lý
- giáo viên chỉ add bot bằng invite link
- giáo viên chỉ cấu hình server/channel trong app
- bot xử lý invite, DM, thông báo và membership flow ở dưới

Nếu giữ đúng boundary đó, feature này sẽ dễ dùng hơn nhiều và tránh biến giáo viên thành người phải tự vận hành Discord infrastructure.
