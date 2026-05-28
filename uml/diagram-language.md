# UML Diagram Language

Diagram labels should describe what a project participant means, not copy the
TypeScript symbol name. Source class names are useful for navigation; UML labels
are for explaining the system.

## Project Diagram Standard

Choose diagrams by what they help readers understand, not by a fixed checklist.

| Purpose | Preferred diagram types |
| --- | --- |
| Functional requirements | Use case, DFD, sequence, activity, collaboration |
| Domain/object behavior | State diagram |
| System design | Component, deployment, or other architecture diagrams when clearer |
| Database design | ERD or database schema diagram |
| UI design | Wireframe, screen flow, sitemap, or navigation flow |

Use UML for functional requirements where UML is the right notation. DFD is
also required for each documented function because it models the data flow of
the function. For database and UI design, prefer the notation that explains the
subject most clearly; do not force it into UML when ERD or wireframes are
clearer.

## Actors

Actors are outside the TMS system boundary.

Project actors:

| Actor | Use when |
| --- | --- |
| Giáo viên | A teacher manages classes, students, sessions, attendance, finance, Discord, or Codeforces setup |
| Quản trị viên | An admin manages teacher accounts or system Discord bot configuration |
| Học sinh | A real student directly interacts with the system, such as authorizing Discord OAuth |
| Discord | The system interacts with Discord OAuth, bot install, guild/channel/member APIs, messages, or voice state |
| Codeforces | The system interacts with Codeforces gym or standing APIs |

Internal schedulers, workers, APIs, modules, databases, and domain objects are
not actors in use case diagrams. They may appear as internal participants in
sequence, collaboration, component, or deployment diagrams.

External systems such as Discord and Codeforces are supporting actors. They
provide identity, membership, messaging, voice-state, gym, or standing data to
TMS use cases. Do not write them as if they own separate business goals inside
the TMS system.

## Project Use Cases

The project has one overview use case diagram. Use these major use cases as the
starting list; do not model every HTTP endpoint as a separate use case.

### Giáo viên

- Đăng nhập
- Xem tổng quan giảng dạy
- Cập nhật hồ sơ cá nhân
- Liên kết tài khoản Discord
- Quản lý học sinh
- Quản lý ghi danh học sinh
- Xử lý học sinh chờ lưu trữ
- Quản lý lớp học
- Quản lý lịch học định kỳ
- Quản lý buổi học
- Điểm danh buổi học
- Theo dõi kết quả học tập
- Quản lý giao dịch tài chính
- Xem báo cáo tài chính
- Thiết lập Discord cho lớp học
- Gửi thông báo cho học sinh
- Gắn Gym Codeforces cho lớp học
- Xem bảng xếp hạng Gym

### Quản trị viên

- Đăng nhập
- Quản lý tài khoản giáo viên
- Cấu hình bot Discord

### Học sinh

- Uỷ quyền quản lý Discord Guild

This student use case means the student authorizes Discord OAuth so the system
can store a `StudentDiscordCredential` and manage the student's Discord guild
membership for the class. Adding the student to a guild depends on this
authorization. Kicking a student from a guild is performed by the bot's server
permissions, not by the student's OAuth permission.

### External Actor Associations

External systems may appear as actors in the overview use case diagram, but
document them as supporting actors associated with TMS use cases.

Discord participates in:

- Liên kết tài khoản Discord
- Uỷ quyền quản lý Discord Guild
- Thiết lập Discord cho lớp học
- Gửi thông báo cho học sinh
- Điểm danh buổi học

Codeforces participates in:

- Gắn Gym Codeforces cho lớp học
- Xem bảng xếp hạng Gym

## Functional Requirements

Use one project-level use case diagram that includes all actors and all major
use cases in the same image. Do not create a separate use case diagram for each
function.

Functional diagrams should be understandable without reading the source code.
Use Vietnamese labels in the diagram. Prefer business/user-facing language over
technical or implementation language.

Avoid implementation details in functional diagrams:

- Do not use source class names, function names, database adapter names, or API
  route names as participant labels.
- Do not use technical buzzwords unless the concept is visible to the business
  flow or is an external system name.
- Prefer labels such as `Người dùng`, `Giao diện`, `Hệ thống`, `Cơ sở dữ liệu`,
  `Discord`, `Codeforces`, `Tài khoản`, `Buổi học`, `Điểm danh`.
- Use English only for stable product/system names such as `Discord`,
  `Codeforces`, or a third-party service name.

Each function still needs a textual use case specification when it is important
enough to document. Use this structure:

- Title
- Summary
- Main event flow
- Alternative event flows
- Preconditions
- Postconditions

Each documented function must also include a DFD. The DFD is not an API or
implementation diagram. It should show the function's input data, processing
step, data store, and output data using the notation from the course slides:

- External entity: user, device, or external system.
- Process: the business function or work step.
- Data flow: information moving between entities, process, and data store.
- Data store: database, file, record, or stored business information.

Use additional UML functional diagrams with these rules:

- Sequence diagram: use when the function has multiple interactions over time
  between actor, system, external systems, or data stores.
- Activity diagram: include as a separate part for every documented use case.
  It describes the activity flow of that use case, not a domain object's
  lifecycle.
- Collaboration diagram: use when the function is complex enough that the
  cooperation between objects/subsystems needs explanation.

State diagrams are separate from functional use case sections. They must model
domain objects with meaningful lifecycle states, not functions.

Simple functions still include the project-level use case diagram,
function-level DFD, function-level activity diagram, and textual specification.

For every documented function, record a diagram decision:

- DFD included.
- Activity diagram included.
- Diagrams included.
- Diagrams omitted.
- Justification for each omitted sequence or collaboration diagram.

Acceptable omission justifications include:

- The function is a simple CRUD/read-only flow with no meaningful branching.
- The interaction is already represented by another similar function's diagram.
- The textual use case specification is sufficient because there is only one
  actor-system exchange.
- The function has no complex object/subsystem collaboration.
- The function has no complex object/subsystem collaboration.

When using similarity as a reason, name the reference function, for example:
"No separate sequence diagram; this flow follows the same interaction pattern as
Create student."

## Functional Diagram Decisions

Use this table as the initial diagram plan for the functional requirements
chapter. The decision is based on the implemented flow shape, not on guesses.

| Use case | Real flow basis | Diagrams included | Diagrams omitted and justification |
| --- | --- | --- | --- |
| Đăng nhập | User submits credentials; system validates account status and returns access token/profile. | DFD, activity, sequence | Collaboration omitted because there is no meaningful object cooperation to explain. |
| Xem tổng quan giảng dạy | Read-only dashboard aggregation. | DFD, activity | Sequence/collaboration omitted because this is a read-only query with no complex interaction. |
| Cập nhật hồ sơ cá nhân | Teacher edits profile fields and system saves the account. | DFD, activity | Sequence/collaboration omitted because this is a simple update flow. |
| Liên kết tài khoản Discord | Teacher starts Discord OAuth, Discord redirects callback, system exchanges code and stores Discord identity. | DFD, activity, sequence | Collaboration omitted because the important part is interaction order with Discord. |
| Quản lý học sinh | Create/update/list student; create validates class and Codeforces handle, then creates student and enrollment. | DFD, sequence, activity | Collaboration omitted because the object cooperation is similar to the enrollment management flow and can be explained there. |
| Quản lý ghi danh học sinh | Transfer, withdraw, and reinstate change enrollment periods, student status, class membership, and balance-sensitive state. | DFD, sequence, activity, collaboration | None. This is one of the core complex business flows. |
| Xử lý học sinh chờ lưu trữ | Pending student can be archived only when balance is zero; active enrollment may be ended. | DFD, activity | Sequence omitted because it follows the same interaction pattern as withdraw/archive in "Quản lý ghi danh học sinh"; collaboration omitted because the cooperation is already covered there. |
| Quản lý lớp học | Create/update/archive class; create/update also stores recurring schedules. | DFD, activity, sequence | Collaboration omitted because object cooperation is simple. |
| Quản lý lịch học định kỳ | Recurring schedules are listed and replaced through class create/update. | DFD, activity | Separate sequence/collaboration omitted because this flow is part of "Quản lý lớp học". |
| Quản lý buổi học | Teacher lists sessions, creates manual session, or cancels session; creation checks class status, future time, duplicates, and overlap. | DFD, sequence, activity | Collaboration omitted because the main complexity is validation/branching, not object cooperation. |
| Điểm danh buổi học | Teacher updates attendance; system validates session, class, student enrollment, cancelled status, then syncs fee record. | DFD, sequence, activity, collaboration | None. This is a complex cross-module business flow involving attendance and finance. |
| Theo dõi kết quả học tập | Teacher views student learning profile and related progress data. | DFD, activity | Sequence/collaboration omitted because this is a read-only reporting flow. |
| Quản lý giao dịch tài chính | Teacher creates/updates income/refund transactions and updates fee record status. | DFD, activity | Sequence omitted because create/update share a standard form-submit-save pattern; collaboration omitted because the business branching is clearer as an activity diagram. |
| Xem báo cáo tài chính | Teacher reads finance summary, balances, fee records, and reports. | DFD, activity | Sequence/collaboration omitted because this is a read-only reporting flow. |
| Thiết lập Discord cho lớp học | Teacher installs/verifies Discord, lists guilds/channels, binds guild and text/voice channels to class with validation. | DFD, sequence, activity | Collaboration omitted because the key complexity is OAuth/install interaction and selection validation. |
| Gửi thông báo cho học sinh | Teacher sends message to class/channel or selected students; system resolves recipients and reports per-target success/failure. | DFD, sequence, activity | Collaboration omitted because partial delivery is better explained as branching than object structure. |
| Gắn Gym Codeforces cho lớp học | Teacher selects an available synced Gym; system checks class status and creates class-bound Gym row. | DFD, activity, sequence | Collaboration omitted because there is no complex object cooperation. |
| Xem bảng xếp hạng Gym | Teacher reads a matrix of synced Codeforces standings for a class Gym. | DFD, activity | Sequence/collaboration omitted because this is a read-only reporting flow; Codeforces sync itself is an internal system process, not a manual use case. |
| Quản lý tài khoản giáo viên | Admin lists and updates teacher accounts. | DFD, activity | Sequence/collaboration omitted because this is simple admin CRUD. |
| Cấu hình bot Discord | Admin stores default Discord bot/OAuth credential used by later Discord flows. | DFD, activity | Sequence/collaboration omitted because this is a simple configuration update; the complex Discord behavior appears in teacher/student Discord use cases. |
| Uỷ quyền quản lý Discord Guild | Student opens Discord OAuth, grants `identify` and `guilds.join`, Discord redirects callback, system stores student Discord identity and token. | DFD, sequence, activity | Collaboration omitted because the important part is the authorization interaction and alternative paths, not object structure. |

## State Diagram Decisions

Use state diagrams only for domain objects whose lifecycle has meaningful
transitions and rules. Do not draw a state diagram just because an object has a
`status` field.

This does not mean the system has only these stateful objects. It means these
are the objects whose state transitions are important enough to model separately
in the report. Other objects may have a status or type field, but their state is
either a simple classification, a one-step transition, an implementation cache,
or already explained inside another functional diagram.

| Object | States | Decision | Justification |
| --- | --- | --- | --- |
| Học sinh | Đang học, Chờ lưu trữ, Đã lưu trữ | Draw state diagram | This is the clearest lifecycle in the project. Withdraw can move a student to pending archive or archived depending on balance; archive requires zero balance; reinstate moves archived students back to active. |
| Buổi học | Đã lên lịch, Đang diễn ra, Đã hoàn tất, Đã huỷ | Draw state diagram | Session status changes over time and by teacher action. Scheduled sessions can be cancelled; the sync worker moves sessions to in-progress and completed based on time; cancelled sessions block attendance updates. |
| Khoản học phí phát sinh | Đang hiệu lực, Đã huỷ | Optional state diagram | This lifecycle is real but small. It is useful only if the finance chapter needs to explain how attendance creates/reactivates a fee record and absence/cancelled sessions cancel it. Otherwise describe it inside the attendance and finance use cases. |
| Lớp học | Đang hoạt động, Đã lưu trữ | Do not draw by default | The lifecycle has only one simple transition, so textual specification is enough unless the class management section needs extra visual coverage. |
| Bản ghi điểm danh | Có mặt, Vắng có phép, Vắng không phép | Do not draw by default | These are attendance values that can be overwritten, not a lifecycle with meaningful state progression. Explain them in the activity/sequence diagram for "Điểm danh buổi học". |
| Giao dịch tài chính | Thu tiền, Hoàn trả | Do not draw | Transaction type is classification, not lifecycle state. |
| Discord/Codeforces data | Synced/cache values | Do not draw | These are external integration/cache data, not project domain lifecycles for state diagrams. |

## Collaboration Diagrams

Use collaboration diagrams only for complex business functions where the
cooperating objects/subsystems are worth explaining.

Notation:

- Use the slide-style object notation `:TênĐốiTượng`.
- Use Vietnamese business names for project concepts.
- Keep external system names as stable product names, such as `:Discord` or
  `:Codeforces`.
- Connect objects with links and label exchanged messages on the links.
- Number messages with `1`, `1.1`, `1.2`, `2`, and so on when order matters.

Modeling rules:

- Do not copy implementation class/module names just because they exist in code.
- Prefer intuitive conceptual participants over source symbols.
- Valid participants include actors, conceptual control objects, domain objects,
  data stores, and external systems.
- Do not include UI/screen nodes by default. Add a boundary object only when it
  is actually meaningful to that specific business function.
- Add data store nodes only when data access is important to understanding the
  collaboration.
- Collaboration diagrams emphasize object links and exchanged messages. Sequence
  diagrams remain the default when the main concern is timeline/control flow.

## Source To Diagram Labels

| Source symbol or group | Meaning in this project | Diagram label |
| --- | --- | --- |
| `AuthController` | HTTP boundary for login and Discord OAuth callbacks | Auth API |
| `AdminController` | HTTP boundary for systeacher account and bot credential actions | Admin API |
| `StudentController` | HTTP boundary for student records, enrollment changes, and student messages | Student API |
| `ClassController`, `ClassScheduleController`, `SessionController`, `AttendanceController` | HTTP boundaries for class, session, and attendance actions | Class API, Session API, Attendance API |
| `ClassDiscordController` | HTTP boundary for bot invite, install callback, guild binding, and class channel posts | Class Discord API |
| `ClassGymController`, `ClassGymStandingReportController` | HTTP boundary for assigning gyms and reading standings | Class Gym API, Gym standing API |
| `Login`, `Register`, `UpdateTeacher`, `ConfigureDiscordBot` | Identity actions, not domain objects | Login, Register teacher, Update teacher, Configure Discord bot |
| `AuthorizeStudentDiscord`, `VerifyTeacherDiscord` | OAuth flows that create or update Discord identities | Student Discord authorization, Teacher Discord verification |
| `CreateStudent`, `TransferStudent`, `WithdrawStudent`, `ReinstateStudent` | Student and enrollment commands | Create student, Transfer student, Withdraw student, Reinstate student |
| `AssignGym`, `UnassignGym`, `GetGymStanding`, `ListAvailableGyms` | Gym catalog, class assignment, and standing read actions | Assign gym, Unassign gym, Read gym standing, List available gyms |
| `AssignDiscordGuild`, `UnassignDiscordGuild`, `GetDiscordBotInviteLink`, `ListDiscordGuilds`, `ListDiscordChannels` | Discord guild/channel binding actions | Assign Discord guild, Unassign Discord guild, Get bot install link, List Discord guilds, List Discord channels |
| `TypeOrm*Reader`, `TypeOrm*Writer`, `*Store`, `*CommandHandlers` | Persistence adapters behind module reader/writer functions | Storage or the specific table/object being stored |
| `TypeOrmStudentDiscordMembershipService`, `StudentDiscordMembershipNotifier` | Adds a linked student Discord identity to the current class guild after enrollment changes | Student guild membership |
| `CodeforcesWorker`, `syncCodeforcesGymsOnce` | Scheduled sync that refreshes gym catalog, problems, and standings | Codeforces gym sync |
| `CodeforcesGym`, `CodeforcesClient` | Codeforces API access for contest list and gym standings | Codeforces API |
| `ClassroomDiscordWorker`, `syncVoiceAttendanceForOpenSessionsOnce` | Scheduled sync that turns Discord voice presence into attendance | Voice attendance sync |
| `DiscordOAuth`, `DiscordGuild`, `DiscordMember`, `DiscordMessenger`, `DiscordVoice`, `DiscordRecipientResolver` | Discord API capabilities | Discord OAuth, Discord guild API, Discord member API, Discord messaging, Discord voice API, Discord recipient lookup |
| `SysadminDiscordBotCredential` | System bot/OAuth credential | Discord bot credential |
| `TeacherCodeforcesCredential` | Teacher Codeforces sync credential | Codeforces credential |
| `StudentDiscordCredential` | Student Discord identity and token | Student Discord credential |
| `Teacher.discord_*` fields | Teacher's linked Discord user identity | Teacher Discord identity |
| `DiscordUserGuild`, `DiscordGuildChannelCache` | Raw Discord guild/channel rows kept before filtering and selection | Discord guild cache, Discord channel cache |
| `ClassDiscordBinding` | Selected Discord guild and channels for a class | Class Discord binding |
| `Gym`, `GymProblem`, `GymStanding` | Codeforces gym catalog, problem list, and per-student/per-problem standing rows | Gym, Gym problem, Gym standing |

## Rules

- Use flow names only as diagram filenames or diagram titles, not as object names.
- State diagrams must show one object's lifecycle.
- Do not mention singleton clients, TypeORM classes, mappers, or helper names unless
  the diagram is specifically about infrastructure.
