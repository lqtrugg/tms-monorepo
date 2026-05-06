# TMS Backend OOP-Driven Refactor Plan

Tài liệu này là kế hoạch refactor backend hiện tại sang kiến trúc OOP-driven. Mục tiêu không phải là đổi tên file hoặc đổi `function` thành `class`. Mục tiêu là đổi trục thiết kế: từ route/service/repository procedural sang object model, use case object, boundary rõ ràng, và adapter ở vòng ngoài.

## 1. Ý tưởng chính của cách chia này

Kiến trúc đề xuất là sự kết hợp thực dụng giữa:

- Object-Oriented Programming: nghiệp vụ nằm trong object có hành vi và invariant.
- Clean Architecture: dependency đi từ ngoài vào trong.
- Hexagonal Architecture: Express, TypeORM, Discord, Codeforces là adapter.
- Tactical DDD: chia theo bounded context, aggregate, value object, repository contract, domain event.
- Modular Monolith: vẫn là một backend deploy chung, nhưng module có boundary rõ.

Nói ngắn gọn:

```txt
HTTP / Job / External Event
  -> Adapter
  -> Controller / Job Handler
  -> Use Case
  -> Domain Object
  -> Repository Contract / External Port
  -> Infrastructure Adapter
```

Ý tưởng quan trọng nhất: **business logic không sống trong Express route, không sống trong TypeORM repository, và không sống trong file service procedural khổng lồ**.

Business logic nên nằm ở:

- Domain model: rule gắn với state của object.
- Value object: rule của khái niệm nhỏ như money, schedule, email, id.
- Domain service/policy: rule nghiệp vụ không thuộc riêng một entity.
- Use case: workflow điều phối nhiều object/repository/port.

## 2. Có phải “go-to” khi muốn code OOP-driven không?

Không phải lúc nào cũng là go-to.

Đây là lựa chọn tốt khi backend có:

- Nhiều nghiệp vụ thay đổi state.
- Nhiều module liên quan nhau.
- Rule phức tạp hơn CRUD.
- Cần test business logic độc lập với HTTP/database.
- Cần refactor lâu dài mà không phá toàn hệ thống.
- Team cần boundary rõ để tránh import chéo tùy tiện.

Đây có thể là overkill nếu app chỉ là:

- CRUD rất mỏng.
- Admin panel đơn giản.
- Prototype ngắn hạn.
- API không có nhiều rule nghiệp vụ.

Với TMS backend hiện tại, hướng này hợp lý vì domain có nhiều lifecycle: student enrollment, class schedule, session, attendance, fee record, transaction, Discord messaging, Codeforces topic. Nếu tiếp tục procedural service, coupling sẽ tăng rất nhanh.

## 3. Cây thư mục đích

```txt
tms-backend/
  src/
    main/
      server.ts
      app.ts
      container.ts
      modules.ts
      adapters/
        express-route.adapter.ts
        express-auth-middleware.adapter.ts
        express-error-handler.adapter.ts

    shared/
      domain/
        Entity.ts
        AggregateRoot.ts
        ValueObject.ts
        DomainEvent.ts
        DomainError.ts
        Result.ts
      application/
        UseCase.ts
        QueryHandler.ts
        UnitOfWork.ts
        EventBus.ts
      presentation/
        Controller.ts
        HttpRequest.ts
        HttpResponse.ts
      infrastructure/
        Logger.ts
        Clock.ts

    infrastructure/
      config/
        env.ts
      database/
        typeorm-data-source.ts
        typeorm-unit-of-work.ts
        typeorm-transaction-scope.ts
      http/
        express-app.ts
      auth/
        passport-jwt.strategy.ts
        jwt-token-issuer.ts
      integrations/
        discord/
          discord-api.client.ts
        codeforces/
          codeforces-api.client.ts
      events/
        in-memory-event-bus.ts
      logging/
        pino-logger.ts

    modules/
      identity/
        domain/
          models/
            Teacher.ts
          value-objects/
            TeacherId.ts
            Email.ts
            PasswordHash.ts
          repositories/
            TeacherRepository.ts
          services/
            PasswordPolicy.ts
        application/
          commands/
            RegisterTeacherUseCase.ts
            LoginTeacherUseCase.ts
            UpdateMyProfileUseCase.ts
            CreateTeacherByAdminUseCase.ts
            UpdateTeacherByAdminUseCase.ts
            EnsureSystemAdminAccountUseCase.ts
          queries/
            GetCurrentTeacherUseCase.ts
            ListTeachersForAdminUseCase.ts
          ports/
            PasswordHasher.ts
            TokenIssuer.ts
          dto/
            AuthDto.ts
            TeacherDto.ts
        infrastructure/
          persistence/
            typeorm/
              TeacherOrmEntity.ts
              TeacherMapper.ts
              TypeOrmTeacherRepository.ts
        presentation/
          controllers/
            RegisterTeacherController.ts
            LoginTeacherController.ts
            MeController.ts
            AdminTeacherController.ts
          routes/
            identity.routes.ts
            admin.routes.ts
        identity.module.ts
        index.ts

      enrollment/
        domain/
          models/
            Student.ts
            Enrollment.ts
          value-objects/
            StudentId.ts
            EnrollmentId.ts
            CodeforcesHandle.ts
            EnrollmentPeriod.ts
          repositories/
            StudentRepository.ts
            EnrollmentRepository.ts
          services/
            EnrollmentPolicy.ts
          events/
            StudentTransferred.ts
            StudentWithdrawn.ts
            StudentReinstated.ts
        application/
          commands/
            CreateStudentUseCase.ts
            UpdateStudentUseCase.ts
            TransferStudentUseCase.ts
            BulkTransferStudentsUseCase.ts
            WithdrawStudentUseCase.ts
            BulkWithdrawStudentsUseCase.ts
            ReinstateStudentUseCase.ts
            ArchivePendingStudentUseCase.ts
          queries/
            StudentReadService.ts
            GetStudentLearningProfileUseCase.ts
            GetDashboardSummaryUseCase.ts
          ports/
            ClassroomPort.ts
            FinancePort.ts
          dto/
            StudentDto.ts
        infrastructure/
          persistence/
            typeorm/
              StudentOrmEntity.ts
              EnrollmentOrmEntity.ts
              StudentMapper.ts
              EnrollmentMapper.ts
              TypeOrmStudentRepository.ts
              TypeOrmEnrollmentRepository.ts
        presentation/
          controllers/
            StudentController.ts
            StudentReportController.ts
          routes/
            enrollment.routes.ts
            student-report.routes.ts
        enrollment.module.ts
        index.ts

      classroom/
        domain/
          models/
            Class.ts
            ClassSchedule.ts
            Session.ts
            Attendance.ts
          value-objects/
            ClassId.ts
            SessionId.ts
            Schedule.ts
            AttendanceStatus.ts
          repositories/
            ClassRepository.ts
            SessionRepository.ts
            AttendanceRepository.ts
          services/
            SessionGenerationPolicy.ts
            AttendancePolicy.ts
          events/
            SessionCreated.ts
            SessionCancelled.ts
            AttendanceUpdated.ts
        application/
          commands/
            CreateClassUseCase.ts
            UpdateClassUseCase.ts
            ArchiveClassUseCase.ts
            CreateClassScheduleUseCase.ts
            UpdateClassScheduleUseCase.ts
            DeleteClassScheduleUseCase.ts
            CreateManualSessionUseCase.ts
            CancelSessionUseCase.ts
            UpsertSessionAttendanceUseCase.ts
            ResetSessionAttendanceUseCase.ts
            MaterializeSessionAttendanceUseCase.ts
          queries/
            ClassroomReadService.ts
            AttendanceReadService.ts
          jobs/
            ReconcileGeneratedClassSessionsUseCase.ts
            SyncSessionStatusesUseCase.ts
            SyncVoiceAttendanceUseCase.ts
            SyncVoiceAttendanceForSessionUseCase.ts
          ports/
            EnrollmentPort.ts
            FinancePort.ts
            MessagingPort.ts
          dto/
            ClassDto.ts
            SessionDto.ts
            AttendanceDto.ts
        infrastructure/
          persistence/
            typeorm/
              ClassOrmEntity.ts
              ClassScheduleOrmEntity.ts
              SessionOrmEntity.ts
              AttendanceOrmEntity.ts
              ClassMapper.ts
              SessionMapper.ts
              TypeOrmClassRepository.ts
              TypeOrmSessionRepository.ts
              TypeOrmAttendanceRepository.ts
        presentation/
          controllers/
            ClassController.ts
            SessionController.ts
            AttendanceController.ts
          routes/
            classroom.routes.ts
            attendance.routes.ts
        classroom.module.ts
        index.ts

      finance/
        domain/
          models/
            Transaction.ts
            FeeRecord.ts
            TransactionAuditLog.ts
          value-objects/
            TransactionId.ts
            FeeRecordId.ts
            Money.ts
          repositories/
            TransactionRepository.ts
            FeeRecordRepository.ts
          services/
            FeePolicy.ts
            BalanceCalculator.ts
          events/
            TransactionCreated.ts
            FeeRecordStatusChanged.ts
        application/
          commands/
            CreateTransactionUseCase.ts
            UpdateTransactionUseCase.ts
            UpdateFeeRecordStatusUseCase.ts
            SyncAttendanceFeeRecordUseCase.ts
            CancelFeeRecordsForSessionsUseCase.ts
          queries/
            FinanceReadService.ts
            GetFinanceSummaryUseCase.ts
            GetIncomeReportUseCase.ts
          ports/
            EnrollmentPort.ts
            ClassroomPort.ts
          dto/
            FinanceDto.ts
          FinanceApplicationPort.ts
        infrastructure/
          persistence/
            typeorm/
              TransactionOrmEntity.ts
              FeeRecordOrmEntity.ts
              TransactionAuditLogOrmEntity.ts
              FinanceMapper.ts
              TypeOrmTransactionRepository.ts
              TypeOrmFeeRecordRepository.ts
        presentation/
          controllers/
            FinanceController.ts
            FinanceReportController.ts
          routes/
            finance.routes.ts
            finance-report.routes.ts
        finance.module.ts
        index.ts

      messaging/
        domain/
          models/
            DiscordServer.ts
            DiscordMessage.ts
            DiscordMessageRecipient.ts
          value-objects/
            DiscordServerId.ts
            DiscordChannelId.ts
          repositories/
            MessagingRepository.ts
          services/
            RecipientResolutionPolicy.ts
        application/
          commands/
            UpsertDiscordServerByClassUseCase.ts
            DeleteDiscordServerUseCase.ts
            SendBulkDmUseCase.ts
            SendChannelPostUseCase.ts
          queries/
            MessagingReadService.ts
          jobs/
            SyncDiscordServersUseCase.ts
          ports/
            DiscordGateway.ts
            EnrollmentPort.ts
            ClassroomPort.ts
          dto/
            MessagingDto.ts
        infrastructure/
          discord/
            DiscordJsGateway.ts
          persistence/
            typeorm/
              DiscordServerOrmEntity.ts
              DiscordMessageOrmEntity.ts
              DiscordMessageRecipientOrmEntity.ts
              MessagingMapper.ts
              TypeOrmMessagingRepository.ts
        presentation/
          controllers/
            MessagingController.ts
          routes/
            messaging.routes.ts
        messaging.module.ts
        index.ts

      topic/
        domain/
          models/
            Topic.ts
            TopicProblem.ts
            TopicStanding.ts
          value-objects/
            TopicId.ts
            CodeforcesProblemId.ts
          repositories/
            TopicRepository.ts
          services/
            TopicPolicy.ts
        application/
          commands/
            CreateTopicUseCase.ts
            CloseTopicUseCase.ts
            AddTopicProblemUseCase.ts
            UpsertTopicStandingUseCase.ts
          queries/
            TopicReadService.ts
            GetTopicStandingMatrixUseCase.ts
          jobs/
            SyncCodeforcesTopicsUseCase.ts
          ports/
            CodeforcesGateway.ts
            EnrollmentPort.ts
            ClassroomPort.ts
          dto/
            TopicDto.ts
        infrastructure/
          codeforces/
            CodeforcesHttpGateway.ts
          persistence/
            typeorm/
              TopicOrmEntity.ts
              TopicProblemOrmEntity.ts
              TopicStandingOrmEntity.ts
              TopicMapper.ts
              TypeOrmTopicRepository.ts
        presentation/
          controllers/
            TopicController.ts
            TopicReportController.ts
          routes/
            topic.routes.ts
        topic.module.ts
        index.ts
```

## 4. Ý nghĩa từng layer

### 4.1 `domain`

Đây là lõi OOP thật sự.

Chứa:

- Entity/domain model có behavior.
- Aggregate root.
- Value object.
- Domain service/policy.
- Repository interface.
- Domain event.

Không chứa:

- Express.
- TypeORM.
- Zod.
- JWT.
- Discord SDK.
- Config/env.

Ví dụ rule đúng chỗ:

```ts
session.cancel();
student.transferTo(classId, transferredAt);
feeRecord.markPaid(payment);
topic.close();
```

### 4.2 `application`

Đây là layer điều phối use case.

Chứa:

- Command use case.
- Query handler/read service.
- Job use case.
- Port interface để gọi module khác hoặc external system.
- DTO/command input/output.

Application biết domain contract, nhưng không biết Express/TypeORM concrete implementation.

### 4.3 `infrastructure`

Đây là adapter kỹ thuật.

Chứa:

- TypeORM entity.
- TypeORM repository implementation.
- Mapper persistence/domain.
- Discord gateway implementation.
- Codeforces gateway implementation.
- Event bus implementation.
- Unit of work implementation.

Infrastructure không quyết định nghiệp vụ. Nó chỉ thực hiện persistence hoặc external I/O.

### 4.4 `presentation`

Đây là adapter cho HTTP.

Chứa:

- Controller.
- Route class.
- HTTP DTO mapping nếu cần.

Controller chỉ làm:

- Lấy param/body/query/user.
- Gọi use case.
- Trả `HttpResponse`.

### 4.5 `main`

Đây là composition root.

Chứa:

- Express app setup.
- Container.
- Module wiring.
- Adapter registration.
- Server bootstrap.

Chỉ ở đây mới được phép lắp concrete implementation với interface.

## 5. Refactor plan

### Phase 0: Chốt rule kiến trúc

Mục tiêu: dừng việc làm codebase rối thêm.

Việc cần làm:

- Không thêm procedural service function mới.
- Không để controller gọi repository.
- Không để service import `AppDataSource` trực tiếp.
- Không import file nội bộ của module khác.
- Không đưa Express `Request/Response` xuống service.
- Không thêm business rule vào TypeORM repository.

Output:

- Tài liệu architecture rule.
- Pull request checklist.
- Quy ước folder cho module mới.

### Phase 1: Tạo shared abstraction và adapter

Mục tiêu: có khung để module mới/refactor module cũ đi theo.

Tạo:

```txt
shared/domain/
shared/application/
shared/presentation/
main/adapters/
main/container.ts
```

Các abstraction cần có:

- `Controller`
- `HttpRequest`
- `HttpResponse`
- `UseCase`
- `QueryHandler`
- `UnitOfWork`
- `DomainError`
- `ValueObject`
- `AggregateRoot`
- `DomainEvent`

Output:

- Express adapter gọi controller interface.
- Error handler chuyển `DomainError` sang HTTP response.
- Container có thể wire use case/controller/repository.

### Phase 2: Chọn module pilot

Không nên bắt đầu bằng toàn bộ backend. Chọn một module để làm chuẩn.

Khuyến nghị:

```txt
Pilot: enrollment
```

Lý do:

- Có domain lifecycle rõ: create, transfer, withdraw, reinstate, archive.
- Không quá phụ thuộc external SDK.
- Có nhiều rule đủ để chứng minh OOP value.
- Ít phức tạp hơn classroom/finance.

Scope pilot:

- `Student`
- `Enrollment`
- `CreateStudentUseCase`
- `TransferStudentUseCase`
- `WithdrawStudentUseCase`
- `ReinstateStudentUseCase`
- `StudentReadService`
- `TypeOrmStudentRepository`
- `TypeOrmEnrollmentRepository`
- `StudentController`

Output:

- Một module hoàn chỉnh theo kiến trúc mới.
- Endpoint cũ vẫn hoạt động.
- Test use case/domain chạy không cần Express.

### Phase 3: Tách domain model khỏi TypeORM entity

Mục tiêu: không dùng ORM entity làm domain model.

Việc cần làm:

- Di chuyển TypeORM entity sang `infrastructure/persistence/typeorm`.
- Tạo domain model trong `domain/models`.
- Tạo value object cho id/status/concept có rule.
- Tạo mapper `toDomain` và `toPersistence`.
- Repository implementation trả domain object.

Output:

```txt
StudentOrmEntity -> StudentMapper -> Student domain model
EnrollmentOrmEntity -> EnrollmentMapper -> Enrollment domain model
```

### Phase 4: Chuyển command workflow sang use case

Mục tiêu: command không còn nằm trong service procedural.

Thứ tự làm với enrollment:

1. `CreateStudentUseCase`
2. `TransferStudentUseCase`
3. `WithdrawStudentUseCase`
4. `ReinstateStudentUseCase`
5. `ArchivePendingStudentUseCase`
6. `BulkTransferStudentsUseCase`
7. `BulkWithdrawStudentsUseCase`

Rule:

- Mỗi use case nhận command object.
- Use case inject repository/port/unit of work qua constructor.
- Use case gọi method trên domain object.
- Use case không nhận Express request.
- Use case không trả ORM entity.

### Phase 5: Query/read side

Mục tiêu: query không làm domain model phình ra.

Với query đơn giản:

```txt
StudentReadService
ClassroomReadService
FinanceReadService
MessagingReadService
TopicReadService
```

Với report phức tạp:

```txt
GetDashboardSummaryUseCase
GetStudentLearningProfileUseCase
GetIncomeReportUseCase
GetTopicStandingMatrixUseCase
```

Rule:

- Query không mutate state.
- Query có thể dùng read repository tối ưu SQL.
- Query không chứa command business rule.

### Phase 6: Cross-module ports

Mục tiêu: bỏ import chéo trực tiếp.

Các port cần có:

```txt
Classroom -> FinancePort
Classroom -> EnrollmentPort
Finance -> EnrollmentPort
Messaging -> EnrollmentPort
Messaging -> ClassroomPort
Topic -> EnrollmentPort
Topic -> ClassroomPort
```

Ví dụ:

```ts
export interface FinancePort {
  syncAttendanceFeeRecord(input: SyncAttendanceFeeRecordInput): Promise<void>;
  cancelFeeRecordsForSessions(sessionIds: string[]): Promise<void>;
}
```

Finance module implement:

```ts
export class FinanceApplicationPort implements FinancePort {
  constructor(
    private readonly syncAttendanceFeeRecordUseCase: SyncAttendanceFeeRecordUseCase,
    private readonly cancelFeeRecordsForSessionsUseCase: CancelFeeRecordsForSessionsUseCase,
  ) {}
}
```

### Phase 7: Refactor các module còn lại

Thứ tự khuyến nghị:

1. `enrollment`
2. `classroom`
3. `finance`
4. `identity`
5. `messaging`
6. `topic`
7. `reporting/read models`

Lý do:

- Enrollment là core dữ liệu học viên.
- Classroom phụ thuộc enrollment và tạo event cho finance.
- Finance cần nhận port/event từ classroom.
- Identity nên ổn định auth/ownership sau khi module boundary rõ hơn.
- Messaging/topic phụ thuộc external adapters nên làm sau.

### Phase 8: Job và external integration

Mục tiêu: job runner cũng chỉ là adapter.

Hiện tại các job nên thành:

- `SyncSessionStatusesUseCase`
- `SyncVoiceAttendanceUseCase`
- `SyncVoiceAttendanceForSessionUseCase`
- `ReconcileGeneratedClassSessionsUseCase`
- `SyncDiscordServersUseCase`
- `SyncCodeforcesTopicsUseCase`
- `EnsureSystemAdminAccountUseCase`

Job runner chỉ gọi use case:

```ts
await syncSessionStatusesUseCase.execute();
```

### Phase 9: Xóa residue cũ

Mục tiêu: loại bỏ nửa cũ nửa mới.

Xóa dần:

- `export async function` nghiệp vụ.
- Global singleton service.
- Controller-level business rule.
- Repository chứa business decision.
- TypeORM entity import từ domain/application.
- Shared `entities/index.ts` toàn cục.

Output cuối:

- Không còn procedural service làm nơi chứa toàn bộ nghiệp vụ.
- Module expose public API rõ.
- Use case command rõ ràng.
- Query/read side rõ ràng.
- Domain object có behavior thật.

## 6. Migration strategy an toàn

Không đổi toàn bộ endpoint cùng lúc.

Chiến lược:

1. Giữ route contract cũ.
2. Controller cũ gọi use case mới.
3. Use case mới dùng repository mới.
4. Repository mới có thể đọc/write cùng table hiện tại.
5. Khi endpoint ổn, xóa service function cũ.
6. Lặp lại theo từng endpoint.

Ví dụ:

```txt
POST /students/:studentId/transfer

Before:
  enrollment.controller.ts
    -> enrollmentService.transferStudent()
    -> procedural repository helpers
    -> TypeORM entity

After step 1:
  TransferStudentController
    -> TransferStudentUseCase
    -> StudentRepository / EnrollmentRepository
    -> TypeOrmStudentRepository
    -> existing database tables
```

## 7. Use case inventory mục tiêu

Ước tính sau refactor:

```txt
Identity & Access:      8
Enrollment:            12
Classroom:             21
Finance:               11
Messaging:              7
Topic & Training:       7
Reporting:              4
-----------------------------------
Tổng:              khoảng 60-70
```

Không phải tất cả đều cần controller riêng. Có thể gom presentation theo resource:

```txt
StudentController
  -> CreateStudentUseCase
  -> UpdateStudentUseCase
  -> TransferStudentUseCase
  -> WithdrawStudentUseCase

ClassController
  -> CreateClassUseCase
  -> UpdateClassUseCase
  -> ArchiveClassUseCase

FinanceController
  -> CreateTransactionUseCase
  -> UpdateTransactionUseCase
  -> UpdateFeeRecordStatusUseCase
```

Nhưng không nên gom command workflow vào một service khổng lồ.

## 8. Definition of done cho refactor

Một module chỉ được xem là refactor xong khi đạt đủ các nhóm yêu cầu bên dưới. Checklist này dùng để review từng module hoặc từng PR migration.

### 8.1 Folder structure

Module phải có cấu trúc rõ ràng:

```txt
modules/<module-name>/
  domain/
    models/
    value-objects/
    repositories/
    services/
    events/
  application/
    commands/
    queries/
    jobs/
    ports/
    dto/
  infrastructure/
    persistence/
      typeorm/
  presentation/
    controllers/
    routes/
  <module-name>.module.ts
  index.ts
```

Yêu cầu:

- `domain/` tồn tại nếu module có business state hoặc invariant.
- `application/commands/` tồn tại nếu module có endpoint/job làm thay đổi state.
- `application/queries/` tồn tại nếu module có endpoint/report đọc dữ liệu.
- `application/ports/` tồn tại nếu module gọi module khác hoặc external system.
- `infrastructure/persistence/typeorm/` chứa toàn bộ TypeORM entity/repository implementation/mapper.
- `presentation/` chứa controller/route HTTP.
- `<module-name>.module.ts` là nơi wire dependency trong module.
- `index.ts` là public API duy nhất của module, không export toàn bộ file nội bộ.

Không đạt nếu:

- Còn folder kiểu `helpers.ts`, `service.ts`, `repository.ts` ở root module chứa logic lớn không rõ layer.
- File domain nằm chung với controller/service.
- TypeORM entity vẫn nằm trong `domain/`.

### 8.2 Import boundary

Import phải theo rule này:

```txt
domain
  -> shared/domain
  -> same module/domain

application
  -> shared/domain
  -> shared/application
  -> same module/domain
  -> same module/application
  -> ports/interfaces

infrastructure
  -> same module/domain
  -> same module/application contracts
  -> shared/*
  -> external libs: typeorm, discord.js, pg, bcrypt, jwt...

presentation
  -> shared/presentation
  -> same module/application
  -> schema/validation của presentation

module.ts / main/container.ts
  -> được import concrete implementations để wire dependency
```

Không đạt nếu bất kỳ file nào có import như sau:

```ts
// domain/application không được có:
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../data-source.js';
import passport from 'passport';
import { Client } from 'discord.js';

// module này không được import internal file module khác:
import { createTransaction } from '../finance/finance.service.js';
import { findOwnedStudent } from '../enrollment/enrollment.repository.js';
```

Yêu cầu cụ thể:

- Không có Express import ngoài `presentation/`, `main/`, hoặc HTTP adapter.
- Không có TypeORM import ngoài `infrastructure/persistence/typeorm/`, database bootstrap, hoặc migration.
- Không có `AppDataSource` import trong `domain/`, `application/`, `presentation/`.
- Không có import chéo vào file nội bộ của module khác.
- Module khác chỉ được dùng public API hoặc port.
- Không có circular dependency giữa module.

### 8.3 Domain layer

Domain layer phải có object model thật, không chỉ là data type.

Yêu cầu:

- Có domain model cho aggregate/entity chính.
- Domain model có method nghiệp vụ, ví dụ `transferTo`, `withdraw`, `archive`, `cancel`, `markPaid`, `complete`.
- Field quan trọng không expose setter public tùy tiện.
- Constructor domain model không cho tạo object invalid.
- Có factory method cho create mới, ví dụ `Student.create(...)`.
- Có restore method cho load từ database, ví dụ `Student.restore(...)`.
- Invariant được enforce trong domain/value object.
- Có value object cho khái niệm có rule: `Money`, `Email`, `Schedule`, `CodeforcesHandle`, `StudentId`, `ClassId`.
- Domain error dùng `DomainError` hoặc typed domain error, không throw raw string.
- Domain event được raise khi state change quan trọng xảy ra.

Không đạt nếu:

- Domain model chỉ là interface/type data bag.
- Domain model chỉ mirror TypeORM entity.
- Business rule vẫn nằm chủ yếu trong controller/service/repository.
- Status transition được set trực tiếp bằng assignment ở ngoài object.
- Validation nghiệp vụ chỉ nằm ở Zod schema.

Ví dụ đạt:

```ts
student.transferTo(targetClassId, transferredAt);
session.cancel(cancelledAt);
feeRecord.markPaid(payment);
```

Ví dụ không đạt:

```ts
student.status = 'withdrawn';
session.status = 'cancelled';
feeRecord.status = body.status;
```

### 8.4 Application layer

Application layer phải điều phối workflow bằng use case object.

Yêu cầu:

- Mỗi command endpoint chính map tới một use case class.
- Mỗi job workflow map tới một use case class.
- Use case nhận input dạng command object, không nhận Express request.
- Use case trả DTO/output rõ ràng, không trả TypeORM entity.
- Use case inject dependency qua constructor.
- Use case không tự `new` repository/service kỹ thuật.
- Use case xác định transaction boundary qua `UnitOfWork` nếu workflow mutate nhiều aggregate/table.
- Use case gọi domain method để đổi state.
- Use case gọi repository contract, không gọi TypeORM concrete repository.
- Use case gọi module khác qua port, không import service module khác.
- Query đơn giản được tách khỏi command workflow bằng read service/query handler.
- Report phức tạp có query handler/use case riêng.

Không đạt nếu:

- Có `export async function createStudent(...)` chứa workflow nghiệp vụ.
- Use case import `express`, `typeorm`, `AppDataSource`, `passport`, `discord.js`.
- Use case nhận `req`, `res`, hoặc `next`.
- Use case chứa SQL query raw không có lý do rõ.
- Một `Service` class chứa toàn bộ command/query/job của module.

### 8.5 Infrastructure layer

Infrastructure chỉ làm kỹ thuật và I/O.

Yêu cầu:

- TypeORM entity nằm trong `infrastructure/persistence/typeorm`.
- TypeORM repository implementation implement repository interface từ domain/application.
- Có mapper rõ ràng giữa ORM entity và domain model.
- Repository implementation không chứa business decision.
- External SDK được bọc sau port/gateway interface.
- Database transaction implementation nằm trong `UnitOfWork` hoặc transaction adapter.
- Persistence model có thể khác domain model, nhưng mapping phải explicit.

Không đạt nếu:

- TypeORM entity được truyền xuyên qua controller/use case/domain.
- Repository implementation quyết định rule nghiệp vụ như role, status transition, fee policy.
- Repository gọi service/use case.
- External SDK như Discord client bị inject thẳng vào use case mà không qua port.

### 8.6 Presentation layer

Presentation chỉ là HTTP adapter.

Yêu cầu:

- Controller implement shared `Controller` interface.
- Controller nhận `HttpRequest`, trả `HttpResponse`.
- Express `Request/Response` chỉ xuất hiện trong adapter/route wiring nếu còn dùng trực tiếp.
- Controller chỉ map params/body/query/user sang command/query.
- Controller không gọi TypeORM repository.
- Controller không chứa business rule.
- Controller không tự tạo service/use case.
- Route file chỉ mount middleware và adapter.
- Validation schema chỉ validate shape/input format, không thay domain invariant.
- Error mapping từ domain/application error sang HTTP nằm ở error adapter.

Không đạt nếu:

- Controller có `if` phức tạp quyết định nghiệp vụ.
- Controller import `AppDataSource`.
- Controller import `TypeOrmXRepository`.
- Controller gọi nhiều repository/service để tự orchestrate workflow.
- Controller có duplicated `getTeacherId`/error handler ở từng file thay vì abstraction chung.

### 8.7 Module composition

Mỗi module phải có composition point rõ ràng.

Yêu cầu:

- `<module>.module.ts` tạo repository implementation, use case, controller, route.
- Module nhận dependencies bên ngoài qua constructor/config object.
- Module expose routes và public ports.
- Module không expose internal repository implementation.
- Module không để controller tự `new UseCase`.
- `main/container.ts` wire các module cấp cao với nhau.
- Public API của module nằm trong `index.ts`.

Không đạt nếu:

- Có singleton service global rải rác.
- Controller file có `const service = new Service()`.
- Module khác import thẳng `../../finance/infrastructure/...`.
- Module khác import thẳng `../../finance/application/commands/...` nếu không nằm trong public contract.

### 8.8 Cross-module communication

Module boundary phải rõ.

Yêu cầu:

- Module gọi module khác qua port interface hoặc domain/application event.
- Port interface nằm ở module cần dùng capability.
- Module provider implement port bằng application port adapter.
- Workflow đồng bộ cần transaction thì gọi qua port trong use case.
- Side effect async hoặc eventual consistency thì dùng domain event.
- Event handler không chứa HTTP concern.

Không đạt nếu:

- `classroom` import thẳng `finance.service.ts`.
- `finance` import thẳng repository helper của `enrollment`.
- Module A update table sở hữu bởi module B mà không qua contract.
- Shared helper chứa logic của nhiều module để né port.

### 8.9 Error handling

Yêu cầu:

- Domain rule violation dùng `DomainError` hoặc error class kế thừa rõ.
- Application error có code ổn định.
- HTTP status mapping nằm ở presentation/main error adapter.
- Không throw raw string.
- Không leak database error message trực tiếp ra response nếu chứa chi tiết nội bộ.
- Constraint/database error được map thành application/domain error phù hợp nếu có thể.

Không đạt nếu:

```ts
throw 'student not found';
throw new Error('bad request');
res.status(500).json(error);
```

### 8.10 Validation

Yêu cầu:

- Zod/schema validate input shape: required field, primitive type, enum string, date format.
- Domain/value object validate business meaning.
- Không dựa hoàn toàn vào Zod cho invariant.
- Command object được tạo sau khi HTTP input đã qua validation.
- Domain object vẫn tự bảo vệ nếu use case gọi sai.

Ví dụ:

```txt
Zod:
  amount là string
  date là ISO date
  status thuộc enum input

Domain:
  Money không âm
  Schedule không conflict
  Session không thể cancel nếu đã completed
  Student không thể transfer nếu đã withdrawn
```

### 8.11 Transaction and consistency

Yêu cầu:

- Workflow mutate nhiều aggregate/table phải có transaction boundary rõ.
- Transaction boundary thường nằm ở use case.
- Repository không tự mở transaction riêng nếu use case cần atomic workflow.
- Domain event được dispatch sau khi transaction commit nếu event gây side effect.
- Không để controller quyết định transaction.
- Không mix nhiều `EntityManager` ngẫu nhiên trong cùng workflow.

Không đạt nếu:

- Mỗi repository tự dùng global data source không cùng transaction.
- Use case gọi nhiều write operation nhưng không có unit of work.
- Event side effect chạy trước khi database commit.

### 8.12 Tests

Một module refactor xong phải có test tối thiểu.

Domain tests:

- Test factory tạo object hợp lệ.
- Test invariant quan trọng.
- Test status transition hợp lệ.
- Test status transition bị cấm.
- Test value object validation.

Use case tests:

- Happy path cho command chính.
- Failure path quan trọng.
- Repository/port được gọi đúng.
- Transaction được dùng với workflow nhiều write.
- Cross-module port được gọi thay vì service nội bộ.

Presentation tests nếu có:

- Controller map request sang command đúng.
- Controller trả status/body đúng.
- Controller không cần Express server để test.

Integration tests nếu có:

- TypeORM repository mapper load/save đúng.
- Route smoke test cho endpoint đã migrate.

Không đạt nếu:

- Chỉ test route happy path.
- Không test domain invariant.
- Test cần start full server cho mọi thứ.

### 8.13 Backward compatibility

Yêu cầu:

- Endpoint contract cũ không đổi nếu chưa có migration API version.
- Response shape giữ tương thích.
- Error code/message không phá frontend nếu frontend đang phụ thuộc.
- Database schema không đổi trừ khi có migration rõ.
- Job schedule không đổi behavior.
- Auth/authorization behavior giữ nguyên hoặc được ghi rõ nếu thay đổi.

Không đạt nếu:

- Refactor làm đổi response key từ `student` sang `data` không có lý do.
- Refactor đổi status code cũ ngoài ý muốn.
- Refactor bỏ middleware ownership/role check.

### 8.14 Cleanup residue

Sau khi endpoint/module đã migrate:

- Xóa function procedural cũ không còn dùng.
- Xóa service class/facade tạm nếu không còn endpoint cũ.
- Xóa repository helper function cũ.
- Xóa duplicate validation/helper/error handler.
- Xóa import từ `entities/index.ts` nếu module đã có ORM/domain entity riêng.
- Xóa dead exports trong `index.ts`.
- Cập nhật docs/use case inventory.

Không đạt nếu:

- Code mới chạy nhưng code cũ vẫn tồn tại song song không lý do.
- Có hai path xử lý cùng một workflow.
- Có mapper cũ và mapper mới cho cùng một entity nhưng không rõ ownership.

### 8.15 Observability

Yêu cầu:

- Use case quan trọng có log ở application boundary hoặc job boundary.
- Log không nằm trong domain model.
- Log không chứa secret/token/password.
- Job use case log start/success/failure với correlation/job id nếu có.
- Error adapter log unexpected error.

Không đạt nếu:

- Domain object import logger.
- Controller spam log business detail.
- Password/token bị log.

### 8.16 Security and authorization

Yêu cầu:

- Authentication vẫn ở HTTP adapter/middleware.
- Authorization coarse-grained có thể ở presentation middleware.
- Ownership/business authorization quan trọng phải được enforce ở use case/domain policy, không chỉ ở route middleware.
- Admin-only use case kiểm tra actor role hoặc nhận actor đã được policy xác thực.
- Không tin `teacherId`, `studentId`, `classId` từ body nếu phải lấy từ authenticated actor/context.

Không đạt nếu:

- Bỏ ownership check vì nghĩ route cũ đã validate.
- Use case có thể bị gọi từ job/test mà bypass hết authorization quan trọng.
- Module khác gọi use case mà không truyền actor/context cần thiết.

### 8.17 Performance

Yêu cầu:

- Query/report dùng read repository tối ưu, không ép domain aggregate load quá nhiều.
- Không tạo N+1 query mới khi chuyển sang repository.
- Mapper không load relation ngầm không kiểm soát.
- Pagination/filter behavior giữ nguyên.
- Bulk use case có strategy riêng, không loop từng item với transaction riêng nếu data lớn.

Không đạt nếu:

- `BulkTransferStudentsUseCase` gọi `TransferStudentUseCase` 200 lần với 200 transaction mà không cân nhắc.
- Report load toàn bộ domain object chỉ để render table.
- Mapper trigger lazy relation khó kiểm soát.

### 8.18 Review gates

Một PR refactor module không được merge nếu còn các dấu hiệu này:

- `export async function` chứa workflow nghiệp vụ mới.
- `AppDataSource` trong controller/use case/domain.
- `Request` hoặc `Response` trong use case/domain.
- `typeorm` import trong domain/application.
- `discord.js` hoặc external SDK import trong use case/domain.
- Controller gọi repository.
- Repository gọi service/use case.
- Module import internal file của module khác.
- Domain model không có behavior, chỉ là data bag.
- Không có test cho invariant chính.
- Không có test cho use case command chính.

## 9. Rủi ro và trade-off

Trade-off chính:

- Nhiều file hơn.
- Cần kỷ luật naming và boundary.
- Refactor ban đầu chậm hơn sửa procedural trực tiếp.
- Query/report cần thiết kế riêng để tránh domain model bị ép làm việc không phù hợp.

Lợi ích:

- Rule nghiệp vụ dễ test.
- Thay Express/TypeORM adapter ít ảnh hưởng core.
- Module boundary rõ hơn.
- Ít import chéo.
- Dễ onboard bằng use case list.
- Dễ thay đổi workflow phức tạp mà không phá controller/repository.

Với TMS, trade-off này đáng trả vì hệ thống đã vượt khỏi CRUD đơn giản.
