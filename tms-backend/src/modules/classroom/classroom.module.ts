import type { AppModule } from '../module.types.js';
import { ClassroomReadService } from './application/queries/ClassroomReadService.js';
import { ClassScheduleReadService } from './application/queries/ClassScheduleReadService.js';
import { ClassSessionReadService } from './application/queries/ClassSessionReadService.js';
import { AttendanceReadService } from './application/queries/AttendanceReadService.js';
import { AttendanceOrmEntity } from './infrastructure/persistence/typeorm/AttendanceOrmEntity.js';
import { ClassScheduleOrmEntity } from './infrastructure/persistence/typeorm/ClassScheduleOrmEntity.js';
import { ClassOrmEntity } from './infrastructure/persistence/typeorm/ClassOrmEntity.js';
import { TypeOrmClassCommandHandlers } from './infrastructure/persistence/typeorm/TypeOrmClassCommandHandlers.js';
import { TypeOrmAttendanceCommandHandlers } from './infrastructure/persistence/typeorm/TypeOrmAttendanceCommandHandlers.js';
import { TypeOrmAttendanceReadRepository } from './infrastructure/persistence/typeorm/TypeOrmAttendanceReadRepository.js';
import { TypeOrmClassReadRepository } from './infrastructure/persistence/typeorm/TypeOrmClassReadRepository.js';
import { TypeOrmClassScheduleCommandHandlers } from './infrastructure/persistence/typeorm/TypeOrmClassScheduleCommandHandlers.js';
import { TypeOrmClassScheduleReadRepository } from './infrastructure/persistence/typeorm/TypeOrmClassScheduleReadRepository.js';
import { TypeOrmSessionCommandHandlers } from './infrastructure/persistence/typeorm/TypeOrmSessionCommandHandlers.js';
import { TypeOrmSessionReadRepository } from './infrastructure/persistence/typeorm/TypeOrmSessionReadRepository.js';
import { SessionOrmEntity } from './infrastructure/persistence/typeorm/SessionOrmEntity.js';
import { ClassController } from './presentation/controllers/ClassController.js';
import { AttendanceController } from './presentation/controllers/AttendanceController.js';
import { ClassScheduleController } from './presentation/controllers/ClassScheduleController.js';
import { SessionController } from './presentation/controllers/SessionController.js';
import { createAttendanceRouter } from './presentation/routes/attendance.routes.js';
import { createClassScheduleRouter } from './presentation/routes/class-schedule.routes.js';
import { createClassroomRouter } from './presentation/routes/classroom.routes.js';
import { createSessionRouter } from './presentation/routes/session.routes.js';
import { AppDataSource } from '../../data-source.js';

const classCommandHandlers = new TypeOrmClassCommandHandlers();
const classScheduleCommandHandlers = new TypeOrmClassScheduleCommandHandlers();
const sessionCommandHandlers = new TypeOrmSessionCommandHandlers();
const attendanceCommandHandlers = new TypeOrmAttendanceCommandHandlers();
const classReadService = new ClassroomReadService(
  new TypeOrmClassReadRepository(AppDataSource.manager),
);
const classScheduleReadService = new ClassScheduleReadService(
  new TypeOrmClassScheduleReadRepository(AppDataSource.manager),
);
const sessionReadService = new ClassSessionReadService(
  new TypeOrmSessionReadRepository(AppDataSource.manager),
);
const attendanceReadService = new AttendanceReadService(
  new TypeOrmAttendanceReadRepository(AppDataSource.manager),
);

const classroomRouter = createClassroomRouter({
  listClasses: new ClassController('listClasses', {
    readService: classReadService,
    createClass: classCommandHandlers,
    updateClass: classCommandHandlers,
    archiveClass: classCommandHandlers,
  }),
  getClassById: new ClassController('getClassById', {
    readService: classReadService,
    createClass: classCommandHandlers,
    updateClass: classCommandHandlers,
    archiveClass: classCommandHandlers,
  }),
  createClass: new ClassController('createClass', {
    readService: classReadService,
    createClass: classCommandHandlers,
    updateClass: classCommandHandlers,
    archiveClass: classCommandHandlers,
  }),
  updateClass: new ClassController('updateClass', {
    readService: classReadService,
    createClass: classCommandHandlers,
    updateClass: classCommandHandlers,
    archiveClass: classCommandHandlers,
  }),
  archiveClass: new ClassController('archiveClass', {
    readService: classReadService,
    createClass: classCommandHandlers,
    updateClass: classCommandHandlers,
    archiveClass: classCommandHandlers,
  }),
});

const classScheduleRouter = createClassScheduleRouter({
  listClassSchedules: new ClassScheduleController('listClassSchedules', {
    readService: classScheduleReadService,
    commandHandlers: classScheduleCommandHandlers,
  }),
  createClassSchedule: new ClassScheduleController('createClassSchedule', {
    readService: classScheduleReadService,
    commandHandlers: classScheduleCommandHandlers,
  }),
  updateClassSchedule: new ClassScheduleController('updateClassSchedule', {
    readService: classScheduleReadService,
    commandHandlers: classScheduleCommandHandlers,
  }),
  deleteClassSchedule: new ClassScheduleController('deleteClassSchedule', {
    readService: classScheduleReadService,
    commandHandlers: classScheduleCommandHandlers,
  }),
});

const sessionRouter = createSessionRouter({
  listSessions: new SessionController('listSessions', {
    readService: sessionReadService,
    commandHandlers: sessionCommandHandlers,
  }),
  listClassSessions: new SessionController('listClassSessions', {
    readService: sessionReadService,
    commandHandlers: sessionCommandHandlers,
  }),
  createManualSession: new SessionController('createManualSession', {
    readService: sessionReadService,
    commandHandlers: sessionCommandHandlers,
  }),
  cancelSession: new SessionController('cancelSession', {
    readService: sessionReadService,
    commandHandlers: sessionCommandHandlers,
  }),
});

const attendanceRouter = createAttendanceRouter({
  getSessionAttendance: new AttendanceController('getSessionAttendance', {
    readService: attendanceReadService,
    commandHandlers: attendanceCommandHandlers,
  }),
  syncSessionAttendance: new AttendanceController('syncSessionAttendance', {
    readService: attendanceReadService,
    commandHandlers: attendanceCommandHandlers,
  }),
  upsertSessionAttendance: new AttendanceController('upsertSessionAttendance', {
    readService: attendanceReadService,
    commandHandlers: attendanceCommandHandlers,
  }),
  listAttendanceRecords: new AttendanceController('listAttendanceRecords', {
    readService: attendanceReadService,
    commandHandlers: attendanceCommandHandlers,
  }),
  resetSessionAttendance: new AttendanceController('resetSessionAttendance', {
    readService: attendanceReadService,
    commandHandlers: attendanceCommandHandlers,
  }),
});

export const classroomModule: AppModule = {
  name: 'classroom',
  entities: [ClassOrmEntity, ClassScheduleOrmEntity, SessionOrmEntity, AttendanceOrmEntity],
  routes: [
    { path: '/', router: classroomRouter },
    { path: '/', router: classScheduleRouter },
    { path: '/', router: sessionRouter },
    { path: '/', router: attendanceRouter },
  ],
};
