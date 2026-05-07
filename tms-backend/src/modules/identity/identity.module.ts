import type { AppModule } from '../module.types.js';
import config from '../../config.js';
import { CreateTeacherByAdminUseCase } from './application/commands/CreateTeacherByAdminUseCase.js';
import { LoginUseCase } from './application/commands/LoginUseCase.js';
import { RegisterUseCase } from './application/commands/RegisterUseCase.js';
import { UpdateTeacherByAdminUseCase } from './application/commands/UpdateTeacherByAdminUseCase.js';
import { UpdateMyProfileUseCase } from './application/commands/UpdateMyProfileUseCase.js';
import { AdminTeacherReadService } from './application/queries/AdminTeacherReadService.js';
import { AuthReadService } from './application/queries/AuthReadService.js';
import { TeacherOrmEntity } from './infrastructure/persistence/typeorm/TeacherOrmEntity.js';
import { TypeOrmTeacherRepository } from './infrastructure/persistence/typeorm/TypeOrmTeacherRepository.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { JwtAccessTokenSigner } from './infrastructure/security/JwtAccessTokenSigner.js';
import { AdminController } from './presentation/controllers/AdminController.js';
import { AuthController } from './presentation/controllers/AuthController.js';
import { createAdminRouter } from './presentation/routes/admin.routes.js';
import { createAuthRouter } from './presentation/routes/auth.routes.js';

const teacherRepository = new TypeOrmTeacherRepository();
const passwordHasher = new BcryptPasswordHasher();
const accessTokenSigner = new JwtAccessTokenSigner();
const authReadService = new AuthReadService();
const adminTeacherReadService = new AdminTeacherReadService(teacherRepository);
const registerUseCase = new RegisterUseCase(
  teacherRepository,
  passwordHasher,
  accessTokenSigner,
  config.auth.jwtExpiresIn,
);
const loginUseCase = new LoginUseCase(
  teacherRepository,
  passwordHasher,
  accessTokenSigner,
  config.auth.jwtExpiresIn,
);
const updateMyProfileUseCase = new UpdateMyProfileUseCase(teacherRepository, passwordHasher);
const createTeacherByAdminUseCase = new CreateTeacherByAdminUseCase(teacherRepository, passwordHasher);
const updateTeacherByAdminUseCase = new UpdateTeacherByAdminUseCase(teacherRepository, passwordHasher);

const authRouter = createAuthRouter({
  register: new AuthController('register', {
    readService: authReadService,
    register: registerUseCase,
    login: loginUseCase,
    updateMe: updateMyProfileUseCase,
  }),
  login: new AuthController('login', {
    readService: authReadService,
    register: registerUseCase,
    login: loginUseCase,
    updateMe: updateMyProfileUseCase,
  }),
  me: new AuthController('me', {
    readService: authReadService,
    register: registerUseCase,
    login: loginUseCase,
    updateMe: updateMyProfileUseCase,
  }),
  updateMe: new AuthController('updateMe', {
    readService: authReadService,
    register: registerUseCase,
    login: loginUseCase,
    updateMe: updateMyProfileUseCase,
  }),
});

const adminRouter = createAdminRouter({
  listTeachers: new AdminController('listTeachers', {
    readService: adminTeacherReadService,
    createTeacher: createTeacherByAdminUseCase,
    updateTeacher: updateTeacherByAdminUseCase,
  }),
  createTeacher: new AdminController('createTeacher', {
    readService: adminTeacherReadService,
    createTeacher: createTeacherByAdminUseCase,
    updateTeacher: updateTeacherByAdminUseCase,
  }),
  updateTeacher: new AdminController('updateTeacher', {
    readService: adminTeacherReadService,
    createTeacher: createTeacherByAdminUseCase,
    updateTeacher: updateTeacherByAdminUseCase,
  }),
});

export const identityModule: AppModule = {
  name: 'identity',
  entities: [TeacherOrmEntity],
  routes: [
    { path: '/', router: authRouter },
    { path: '/admin', router: adminRouter },
  ],
};
