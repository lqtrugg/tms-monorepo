import type { AppModule } from '../module.types.js';
import { Attendance } from './domain/attendance.entity.js';
import { ClassSchedule } from './domain/class-schedule.entity.js';
import { Class } from './domain/class.entity.js';
import { Session } from './domain/session.entity.js';
import { classRouter, sessionsRouter } from './index.js';

export const classroomModule: AppModule = {
  name: 'classroom',
  entities: [Class, ClassSchedule, Session, Attendance],
  routes: [
    { path: '/', router: classRouter },
    { path: '/', router: sessionsRouter },
  ],
};

