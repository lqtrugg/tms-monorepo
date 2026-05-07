# OOP-Driven Backend Blueprint

Tài liệu này mô tả hướng thiết kế lại backend theo tư duy OOP-driven. ExpressJS chỉ là HTTP adapter ở vòng ngoài. TypeORM chỉ là persistence adapter. Trọng tâm của codebase là object model, use case object, service object, repository contract và dependency composition rõ ràng.

## 1. Vấn đề cần sửa

Codebase hiện tại không nên được xem là OOP-driven nếu chỉ đổi `function` thành `class`. Một codebase vẫn không OOP-driven khi:

- Controller gọi trực tiếp nhiều hàm procedural.
- Service là collection của các method không có state, không có invariant, không có ownership.
- Repository bị trộn giữa query, transaction, business rule và mapping.
- Entity TypeORM bị dùng như domain model duy nhất.
- Module chỉ là folder gom file, không phải object có contract rõ.
- Express `Request/Response` chảy sâu vào service hoặc domain.
- Cross-module import trực tiếp phá vỡ boundary.

OOP-driven nghĩa là nghiệp vụ được biểu diễn bằng object có trách nhiệm rõ ràng. Class không phải để trang trí. Class phải che giấu state, bảo vệ invariant, thể hiện hành vi, và được lắp ghép qua dependency contract.

## 2. Kiến trúc đích

```txt
src/
  main/
    server.ts
    app.ts
    container.ts
    modules.ts
    adapters/
      express-route.adapter.ts
      express-middleware.adapter.ts

  shared/
    application/
      UseCase.ts
      UnitOfWork.ts
      TransactionScope.ts
    domain/
      Entity.ts
      ValueObject.ts
      DomainEvent.ts
      DomainError.ts
      Result.ts
    presentation/
      Controller.ts
      HttpRequest.ts
      HttpResponse.ts

  infrastructure/
    database/
      typeorm-data-source.ts
      typeorm-unit-of-work.ts
    http/
      express-error-handler.ts
    logger/
      logger.ts
    config/
      env.ts

  modules/
    classroom/
      domain/
        models/
          Class.ts
          Session.ts
          Attendance.ts
        value-objects/
          ClassId.ts
          SessionId.ts
          Schedule.ts
        repositories/
          ClassRepository.ts
          SessionRepository.ts
        services/
          SessionPolicy.ts
        events/
          SessionCompleted.ts

      application/
        use-cases/
          CreateClassUseCase.ts
          ScheduleSessionUseCase.ts
          CompleteSessionUseCase.ts
        ports/
          FinancePort.ts
          IdentityPort.ts
        dto/
          CreateClassCommand.ts
          ClassDto.ts

      infrastructure/
        persistence/
          typeorm/
            ClassOrmEntity.ts
            SessionOrmEntity.ts
            TypeOrmClassRepository.ts
            TypeOrmSessionRepository.ts
            ClassroomMapper.ts

      presentation/
        controllers/
          CreateClassController.ts
          ScheduleSessionController.ts
        routes/
          classroom.routes.ts

      classroom.module.ts
```

## 3. Dependency rule

Dependency luôn đi từ ngoài vào trong.

```txt
main
  -> presentation
  -> application
  -> domain

infrastructure
  -> application contracts
  -> domain
```

Không được đi ngược lại:

- `domain` không import Express, TypeORM, Zod, config, logger.
- `application` không import Express hoặc TypeORM concrete class.
- `presentation` không import repository implementation.
- `infrastructure` không chứa business rule.
- Module này không import thẳng infrastructure của module khác.

Nếu cần giao tiếp giữa module, dùng port/interface hoặc domain event.

## 4. OOP-driven nằm ở đâu?

OOP-driven nằm ở 5 nhóm object chính.

### 4.1 Domain model

Domain model giữ state và invariant. Không cho phép code bên ngoài sửa state tùy tiện.

```ts
export class Class {
  private constructor(
    private readonly id: ClassId,
    private name: string,
    private status: ClassStatus,
    private readonly sessions: Session[],
  ) {}

  static create(input: CreateClassProps): Class {
    if (!input.name.trim()) {
      throw new DomainError('class_name_required');
    }

    return new Class(
      ClassId.new(),
      input.name.trim(),
      ClassStatus.Active,
      [],
    );
  }

  rename(name: string): void {
    if (!name.trim()) {
      throw new DomainError('class_name_required');
    }

    this.name = name.trim();
  }

  archive(): void {
    if (this.sessions.some((session) => session.isInProgress())) {
      throw new DomainError('cannot_archive_class_with_running_session');
    }

    this.status = ClassStatus.Archived;
  }
}
```

Rule:

- Domain object có method nghiệp vụ: `archive`, `complete`, `cancel`, `assignTeacher`.
- Không expose setter đại trà.
- Constructor thường private/protected, tạo object qua factory method.
- Invariant nằm trong object, không rải trong controller/service.

### 4.2 Value object

Value object đại diện cho khái niệm nhỏ nhưng có rule riêng.

```ts
export class Money {
  private constructor(private readonly amount: bigint) {}

  static fromDecimal(value: string): Money {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      throw new DomainError('invalid_money');
    }

    const [whole, fraction = ''] = value.split('.');
    return new Money(BigInt(`${whole}${fraction.padEnd(2, '0')}`));
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  toMinorUnit(): bigint {
    return this.amount;
  }
}
```

Rule:

- Dùng value object cho `Money`, `Email`, `PhoneNumber`, `DateRange`, `Schedule`, `ClassId`.
- Không truyền string/number thô qua nhiều layer nếu nó có rule nghiệp vụ.

### 4.3 Use case object

Use case là application workflow. Nó điều phối domain object, repository và port.

```ts
export class CompleteSessionUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly finance: FinancePort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(command: CompleteSessionCommand): Promise<void> {
    await this.unitOfWork.transaction(async () => {
      const session = await this.sessions.requireById(
        SessionId.from(command.sessionId),
      );

      session.complete(command.completedAt);

      await this.sessions.save(session);
      await this.finance.createFeeRecordsForCompletedSession(session);
    });
  }
}
```

Rule:

- Mỗi use case đại diện cho một user intent hoặc system intent.
- Use case không nhận Express `Request`.
- Use case không trả TypeORM entity.
- Use case không tự new repository.
- Transaction boundary nằm ở use case hoặc application service, không nằm rải trong controller.

### 4.4 Repository contract

Repository là contract của domain/application. Implementation nằm ở infrastructure.

```ts
export interface SessionRepository {
  requireById(id: SessionId): Promise<Session>;
  findByClassId(classId: ClassId): Promise<Session[]>;
  save(session: Session): Promise<void>;
}
```

Rule:

- Interface nằm gần domain/application.
- Method dùng domain object/value object, không dùng `Request`, `Response`, hoặc ORM entity.
- Repository không chứa business decision kiểu `if teacher is admin then ...`.

### 4.5 Controller object

Controller chỉ map HTTP sang use case.

```ts
export class CompleteSessionController implements Controller {
  constructor(private readonly completeSession: CompleteSessionUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    await this.completeSession.execute({
      sessionId: request.params.sessionId,
      completedAt: new Date(),
      actorId: request.user.id,
    });

    return {
      statusCode: 204,
      body: null,
    };
  }
}
```

Rule:

- Controller không chứa business rule.
- Controller không gọi TypeORM repository.
- Controller không biết transaction implementation.
- Controller chỉ parse input, gọi use case, format output.

## 5. Express là HTTP adapter

Express route chỉ chuyển request sang controller interface.

```ts
export function adaptExpressRoute(controller: Controller) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await controller.handle({
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers,
        user: req.user,
      });

      res.status(response.statusCode);

      if (response.body === null) {
        res.end();
        return;
      }

      res.json(response.body);
    } catch (error) {
      next(error);
    }
  };
}
```

Route file chỉ mount adapter.

```ts
export class ClassroomRoutes {
  readonly router = Router();

  constructor(
    private readonly createClassController: CreateClassController,
    private readonly completeSessionController: CompleteSessionController,
  ) {
    this.router.post('/classes', adaptExpressRoute(this.createClassController));
    this.router.post(
      '/sessions/:sessionId/complete',
      adaptExpressRoute(this.completeSessionController),
    );
  }
}
```

## 6. TypeORM là persistence adapter

Không dùng TypeORM entity làm domain model nếu muốn OOP-driven thật sự. TypeORM entity là database shape. Domain model là business shape.

```ts
@Entity('sessions')
export class SessionOrmEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  classId!: string;

  @Column()
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}
```

Mapper chuyển ORM entity sang domain model.

```ts
export class SessionMapper {
  toDomain(entity: SessionOrmEntity): Session {
    return Session.restore({
      id: SessionId.from(entity.id),
      classId: ClassId.from(entity.classId),
      status: SessionStatus.from(entity.status),
      completedAt: entity.completedAt,
    });
  }

  toPersistence(session: Session): SessionOrmEntity {
    const snapshot = session.toSnapshot();

    return {
      id: snapshot.id,
      classId: snapshot.classId,
      status: snapshot.status,
      completedAt: snapshot.completedAt,
    };
  }
}
```

Repository implementation dùng mapper.

```ts
export class TypeOrmSessionRepository implements SessionRepository {
  constructor(
    private readonly repository: Repository<SessionOrmEntity>,
    private readonly mapper: SessionMapper,
  ) {}

  async requireById(id: SessionId): Promise<Session> {
    const entity = await this.repository.findOneBy({ id: id.value });

    if (!entity) {
      throw new DomainError('session_not_found');
    }

    return this.mapper.toDomain(entity);
  }

  async save(session: Session): Promise<void> {
    await this.repository.save(this.mapper.toPersistence(session));
  }
}
```

## 7. Module là composition unit

Mỗi module tự khai báo object graph của nó.

```ts
export class ClassroomModule {
  readonly routes: ModuleRoute[];

  constructor(dependencies: ClassroomModuleDependencies) {
    const sessionMapper = new SessionMapper();

    const sessionRepository = new TypeOrmSessionRepository(
      dependencies.dataSource.getRepository(SessionOrmEntity),
      sessionMapper,
    );

    const completeSessionUseCase = new CompleteSessionUseCase(
      sessionRepository,
      dependencies.financePort,
      dependencies.unitOfWork,
    );

    const completeSessionController = new CompleteSessionController(
      completeSessionUseCase,
    );

    const classroomRoutes = new ClassroomRoutes(
      createClassController,
      completeSessionController,
    );

    this.routes = [{ path: '/classroom', router: classroomRoutes.router }];
  }
}
```

Rule:

- `main/container.ts` lắp module cấp cao.
- Module expose route và public ports.
- Module không expose repository implementation cho module khác.
- Module khác muốn dùng capability thì gọi port/application service đã public.

## 8. Cross-module communication

Không import service module khác trực tiếp.

Sai:

```ts
import { createFeeRecords } from '../finance/finance.service';
```

Đúng:

```ts
export interface FinancePort {
  createFeeRecordsForCompletedSession(session: Session): Promise<void>;
}
```

Finance module cung cấp adapter:

```ts
export class FinanceApplicationPort implements FinancePort {
  constructor(private readonly createFeeRecords: CreateFeeRecordsUseCase) {}

  async createFeeRecordsForCompletedSession(session: Session): Promise<void> {
    await this.createFeeRecords.execute({
      sessionId: session.id.value,
      classId: session.classId.value,
      completedAt: session.completedAt,
    });
  }
}
```

Với workflow async hoặc không cần transaction đồng bộ, dùng domain event.

```ts
export class SessionCompleted implements DomainEvent {
  readonly name = 'classroom.session_completed';

  constructor(
    readonly sessionId: string,
    readonly classId: string,
    readonly occurredAt: Date,
  ) {}
}
```

## 9. Setup project mới

### 9.1 Cài dependency

```bash
npm init -y
npm install express zod typeorm pg reflect-metadata dotenv pino
npm install -D typescript ts-node nodemon @types/node @types/express
```

Nếu cần auth:

```bash
npm install passport passport-jwt jsonwebtoken bcrypt
npm install -D @types/passport @types/passport-jwt @types/jsonwebtoken @types/bcrypt
```

### 9.2 TypeScript config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

### 9.3 Scripts

```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec \"node --loader ts-node/esm\" ./src/main/server.ts",
    "build": "tsc",
    "start": "node dist/main/server.js"
  }
}
```

### 9.4 Entry point

```ts
import 'reflect-metadata';

import { createApp } from './app.js';
import { createContainer } from './container.js';

const container = await createContainer();
const app = createApp(container);

app.listen(container.config.port, () => {
  container.logger.info({ port: container.config.port }, 'server_started');
});
```

## 10. Migration plan từ codebase hiện tại

Không nên refactor toàn bộ một lần. Làm theo từng bounded context.

### Phase 1: Đóng băng boundary

- Chọn module đầu tiên để chuẩn hóa, nên bắt đầu với module ít phụ thuộc nhất.
- Cấm thêm procedural function mới vào module đó.
- Cấm controller gọi repository trực tiếp.
- Cấm module khác import file nội bộ của module đó.
- Tạo `module.ts` làm public composition point.

Output của phase này:

```txt
modules/classroom/classroom.module.ts
modules/classroom/index.ts
modules/classroom/application/
modules/classroom/domain/
modules/classroom/infrastructure/
modules/classroom/presentation/
```

### Phase 2: Tách application use case

- Mỗi endpoint chính có một use case class.
- Service cũ chỉ được giữ tạm như facade nếu cần.
- Business workflow chuyển từ controller/service procedural sang use case.
- Input/output dùng command/dto riêng.

Ví dụ mapping:

```txt
POST /sessions/:id/complete
  -> CompleteSessionController
  -> CompleteSessionUseCase
  -> Session.complete()
  -> SessionRepository.save()
  -> FinancePort.createFeeRecordsForCompletedSession()
```

### Phase 3: Tách domain model khỏi ORM entity

- Giữ TypeORM entity trong `infrastructure/persistence/typeorm`.
- Tạo domain model trong `domain/models`.
- Tạo mapper giữa ORM và domain.
- Repository implementation trả domain model.

Không cần làm hết entity ngay. Bắt đầu với aggregate có nhiều rule nhất.

### Phase 4: Chuẩn hóa dependency injection

- Tạo `main/container.ts`.
- Tất cả dependency được truyền qua constructor.
- Không `new Service()` rải trong controller.
- Không import singleton DB trong use case/domain.
- Không dùng service locator trong business code.

### Phase 5: Cross-module bằng port/event

- Liệt kê các import chéo hiện tại.
- Với call đồng bộ, tạo port interface ở module gọi.
- Với side effect, tạo domain event và handler.
- Module provider implement port ở application layer hoặc infrastructure layer.

### Phase 6: Xóa procedural residue

- Xóa các `export async function` nghiệp vụ.
- Xóa helper nghiệp vụ rải rác, chuyển vào domain service/value object.
- Controller còn lại chỉ là adapter.
- Repository chỉ còn persistence concern.

## 11. Checklist khi thêm feature mới

Trước khi code:

- Feature thuộc bounded context nào?
- Aggregate root là object nào?
- Invariant nằm trong domain model nào?
- User/system intent là use case nào?
- Cần repository contract nào?
- Có cần gọi module khác không? Nếu có, port hay event?
- HTTP endpoint chỉ là adapter nào?

Khi code:

- Tạo command/dto cho use case.
- Tạo hoặc mở rộng domain method.
- Tạo use case class.
- Tạo repository contract nếu chưa có.
- Tạo infrastructure repository implementation.
- Tạo controller class.
- Mount route bằng Express adapter.
- Wire dependency trong module/container.

Review trước khi merge:

- Có import Express trong application/domain không?
- Có import TypeORM trong application/domain không?
- Có business rule trong controller không?
- Có business rule trong repository không?
- Có function procedural mới không?
- Có module nào import file nội bộ của module khác không?
- Có test cho domain rule hoặc use case quan trọng không?

## 12. Naming convention

```txt
Domain model:          Class, Session, Student
Value object:          Money, Email, ClassId
Domain service:        SessionPolicy, FeeCalculationPolicy
Use case:              CompleteSessionUseCase
Command:               CompleteSessionCommand
DTO:                   SessionDto
Repository contract:   SessionRepository
Repository impl:       TypeOrmSessionRepository
Mapper:                SessionMapper
Controller:            CompleteSessionController
Routes:                ClassroomRoutes
Module:                ClassroomModule
Port:                  FinancePort
Port implementation:   FinanceApplicationPort
```

## 13. Definition of done

Một module được xem là OOP-driven khi:

- Domain model có behavior thật, không chỉ là data bag.
- Invariant nằm trong domain/value object.
- Use case là class điều phối workflow.
- Dependency được inject qua constructor.
- Repository là interface ở trong boundary, implementation ở infrastructure.
- Express chỉ xuất hiện ở presentation/main adapter.
- TypeORM chỉ xuất hiện ở infrastructure.
- Cross-module dependency đi qua port/event.
- Public API của module rõ ràng qua `module.ts` hoặc `index.ts`.

## 14. Ước tính use case cho TMS backend

Không nên gom mọi method hiện tại thành một class service lớn. Với OOP-driven, mỗi use case nên đại diện cho một intent rõ ràng của user hoặc system.

Ước tính hiện tại:

```txt
Identity & Access:      8 use cases
Enrollment:            12 use cases
Classroom:             21 use cases
Finance:               11 use cases
Messaging:              7 use cases
Topic & Training:       7 use cases
Reporting:              4 use cases
-----------------------------------
Tổng ước tính:      60-70 use cases
```

Con số này không có nghĩa là phải tạo 70 folder lớn. Use case class thường nhỏ, mỗi class chỉ orchestration một workflow. Query/report đơn giản có thể dùng `QueryHandler` riêng để tránh làm domain model phình ra.

### 14.1 Identity & Access

Command use cases:

- `RegisterTeacherUseCase`
- `LoginTeacherUseCase`
- `UpdateMyProfileUseCase`
- `CreateTeacherByAdminUseCase`
- `UpdateTeacherByAdminUseCase`
- `EnsureSystemAdminAccountUseCase`

Query use cases:

- `GetCurrentTeacherUseCase`
- `ListTeachersForAdminUseCase`

Domain/application objects quan trọng:

- `Teacher`
- `PasswordHash`
- `TeacherRole`
- `AuthTokenIssuer`
- `PasswordHasher`
- `TeacherRepository`

### 14.2 Enrollment

Command use cases:

- `CreateStudentUseCase`
- `UpdateStudentUseCase`
- `TransferStudentUseCase`
- `BulkTransferStudentsUseCase`
- `WithdrawStudentUseCase`
- `BulkWithdrawStudentsUseCase`
- `ReinstateStudentUseCase`
- `ArchivePendingStudentUseCase`

Query use cases:

- `ListStudentsUseCase`
- `GetStudentByIdUseCase`
- `GetDashboardSummaryUseCase`
- `GetStudentLearningProfileUseCase`

Domain/application objects quan trọng:

- `Student`
- `Enrollment`
- `EnrollmentPeriod`
- `StudentStatus`
- `CodeforcesHandle`
- `EnrollmentPolicy`
- `StudentRepository`
- `EnrollmentRepository`
  - with the current enrollment direction, these live under `infrastructure/persistence/typeorm/`, not `domain/`

### 14.3 Classroom

Command use cases:

- `CreateClassUseCase`
- `UpdateClassUseCase`
- `ArchiveClassUseCase`
- `CreateClassScheduleUseCase`
- `UpdateClassScheduleUseCase`
- `DeleteClassScheduleUseCase`
- `CreateManualSessionUseCase`
- `CancelSessionUseCase`
- `UpsertSessionAttendanceUseCase`
- `UpsertBotSessionAttendanceUseCase`
- `MaterializeSessionAttendanceUseCase`
- `ResetSessionAttendanceUseCase`
- `SyncVoiceAttendanceForSessionUseCase`
- `ReconcileGeneratedClassSessionsUseCase`
- `SyncSessionStatusesUseCase`
- `SyncVoiceAttendanceUseCase`

Query use cases:

- `ListClassesUseCase`
- `GetClassByIdUseCase`
- `ListClassSchedulesUseCase`
- `ListSessionsUseCase`
- `ListClassSessionsUseCase`
- `ListSessionAttendanceUseCase`
- `ListAttendanceRecordsUseCase`

Domain/application objects quan trọng:

- `Class`
- `ClassSchedule`
- `Session`
- `Attendance`
- `Schedule`
- `SessionStatus`
- `AttendanceStatus`
- `SessionGenerationPolicy`
- `AttendancePolicy`
- `ClassRepository`
- `SessionRepository`
- `AttendanceRepository`

Ghi chú: Classroom có nhiều use case nhất vì nó đang giữ lifecycle của class, schedule, session và attendance. Đây là module nên refactor sớm nhưng không nên làm toàn bộ cùng lúc.

### 14.4 Finance

Command use cases:

- `CreateTransactionUseCase`
- `UpdateTransactionUseCase`
- `UpdateFeeRecordStatusUseCase`
- `SyncAttendanceFeeRecordUseCase`
- `CancelFeeRecordsForSessionsUseCase`

Query use cases:

- `ListTransactionsUseCase`
- `ListFeeRecordsUseCase`
- `ListTransactionAuditLogsUseCase`
- `ListStudentBalancesUseCase`
- `GetFinanceSummaryUseCase`
- `GetIncomeReportUseCase`

Domain/application objects quan trọng:

- `Transaction`
- `FeeRecord`
- `TransactionAuditLog`
- `Money`
- `StudentBalance`
- `FeePolicy`
- `TransactionRepository`
- `FeeRecordRepository`

Ghi chú: `SyncAttendanceFeeRecordUseCase` và `CancelFeeRecordsForSessionsUseCase` nên được expose qua `FinancePort` cho Classroom, không để Classroom import thẳng Finance service.

### 14.5 Messaging

Command use cases:

- `UpsertDiscordServerByClassUseCase`
- `DeleteDiscordServerUseCase`
- `SendBulkDmUseCase`
- `SendChannelPostUseCase`
- `SyncDiscordServersUseCase`

Query use cases:

- `ListDiscordServersUseCase`
- `ListMessagesUseCase`

Domain/application objects quan trọng:

- `DiscordServer`
- `DiscordMessage`
- `DiscordMessageRecipient`
- `MessageRecipientResolver`
- `DiscordGateway`
- `MessagingRepository`

Ghi chú: Discord API là external adapter. Use case không nên phụ thuộc trực tiếp vào `discord.js`.

### 14.6 Topic & Training

Command use cases:

- `CreateTopicUseCase`
- `CloseTopicUseCase`
- `AddTopicProblemUseCase`
- `UpsertTopicStandingUseCase`
- `SyncCodeforcesTopicsUseCase`

Query use cases:

- `ListTopicsUseCase`
- `GetTopicStandingMatrixUseCase`

Domain/application objects quan trọng:

- `Topic`
- `TopicProblem`
- `TopicStanding`
- `CodeforcesProblem`
- `TopicPolicy`
- `CodeforcesGateway`
- `TopicRepository`

### 14.7 Reporting

Report/query use cases có thể nằm trong module sở hữu dữ liệu hoặc một reporting module riêng.

- `GetDashboardSummaryUseCase`
- `GetStudentLearningProfileUseCase`
- `GetIncomeReportUseCase`
- `GetTopicStandingMatrixUseCase`

Rule:

- Report use case được phép đọc nhiều repository/read model.
- Report use case không nên mutate state.
- Report phức tạp nên dùng read model hoặc query repository riêng.
- Không nhét report logic vào domain entity.

## 15. Cách gom use case để không nổ số lượng file

Không cần over-engineer bằng cách tạo quá nhiều abstraction quanh từng endpoint nhỏ. Cách gom hợp lý:

- Command làm thay đổi state: gần như luôn là một use case class riêng.
- Query đơn giản: có thể là một query handler class hoặc method trong `ReadService` nếu không có business rule.
- Report phức tạp: một use case/query handler riêng.
- Job/system workflow: một use case riêng, adapter job runner chỉ gọi nó.
- Helper nghiệp vụ lặp lại: chuyển thành domain service hoặc policy object.

Ví dụ cấu trúc cân bằng:

```txt
modules/classroom/
  application/
    commands/
      CreateClassUseCase.ts
      ArchiveClassUseCase.ts
      CreateManualSessionUseCase.ts
      CancelSessionUseCase.ts
      UpsertSessionAttendanceUseCase.ts
    queries/
      ClassroomReadService.ts
      AttendanceReadService.ts
    jobs/
      SyncSessionStatusesUseCase.ts
      SyncVoiceAttendanceUseCase.ts
```

`ReadService` được chấp nhận nếu nó chỉ đọc và format dữ liệu. Nhưng command workflow không nên gom hết vào một `ClassroomService` khổng lồ.
