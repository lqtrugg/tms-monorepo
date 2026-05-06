import type { AppModule } from '../module.types.js';
import { Enrollment } from './domain/enrollment.entity.js';
import { Student } from './domain/student.entity.js';
import { studentReportRouter, studentRouter } from './index.js';

export const enrollmentModule: AppModule = {
  name: 'enrollment',
  entities: [Student, Enrollment],
  routes: [
    { path: '/', router: studentRouter },
    { path: '/', router: studentReportRouter },
  ],
};
