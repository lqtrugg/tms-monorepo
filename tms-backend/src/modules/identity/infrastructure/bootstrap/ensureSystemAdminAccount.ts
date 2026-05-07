import config from '../../../../config.js';
import { TeacherRole } from '../../../../entities/enums.js';
import { BcryptPasswordHasher } from '../security/BcryptPasswordHasher.js';
import { TypeOrmTeacherRepository } from '../persistence/typeorm/TypeOrmTeacherRepository.js';

const teacherRepository = new TypeOrmTeacherRepository();
const passwordHasher = new BcryptPasswordHasher();

export async function ensureSystemAdminAccount(): Promise<void> {
  const sysAdminUsername = config.auth.sysAdminUsername;
  const sysAdminPassword = config.auth.sysAdminPassword ?? 'gaheocho123';

  let sysAdmin = await teacherRepository.findByUsername(sysAdminUsername);
  const passwordHash = await passwordHasher.hash(sysAdminPassword);

  if (!sysAdmin) {
    sysAdmin = teacherRepository.create({
      username: sysAdminUsername,
      password_hash: passwordHash,
      role: TeacherRole.SysAdmin,
      is_active: true,
      codeforces_handle: null,
      codeforces_api_key: null,
      codeforces_api_secret: null,
    });

    await teacherRepository.save(sysAdmin);
    return;
  }

  let hasChanges = false;

  if (sysAdmin.role !== TeacherRole.SysAdmin) {
    sysAdmin.role = TeacherRole.SysAdmin;
    hasChanges = true;
  }

  if (!sysAdmin.is_active) {
    sysAdmin.is_active = true;
    hasChanges = true;
  }

  const passwordMatches = await passwordHasher.compare(sysAdminPassword, sysAdmin.password_hash);
  if (!passwordMatches) {
    sysAdmin.password_hash = passwordHash;
    hasChanges = true;
  }

  if (hasChanges) {
    await teacherRepository.save(sysAdmin);
  }
}
