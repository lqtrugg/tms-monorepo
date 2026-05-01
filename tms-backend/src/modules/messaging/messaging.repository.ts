import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../data-source.js';
import {
  Class,
  DiscordMessage,
  DiscordMessageRecipient,
  DiscordServer,
  Enrollment,
  Student,
} from '../../entities/index.js';

export function classRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Class);
}

export function discordServerRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(DiscordServer);
}

export function discordMessageRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(DiscordMessage);
}

export function discordMessageRecipientRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(DiscordMessageRecipient);
}

export function enrollmentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Enrollment);
}

export function studentRepository(manager: EntityManager = AppDataSource.manager) {
  return manager.getRepository(Student);
}

export function findOwnedClass(teacherId: number, classId: number): Promise<Class | null> {
  return classRepository().findOneBy({
    id: classId,
    teacher_id: teacherId,
  });
}

export function findDiscordServerByClass(
  teacherId: number,
  classId: number,
): Promise<DiscordServer | null> {
  return discordServerRepository().findOneBy({
    teacher_id: teacherId,
    class_id: classId,
  });
}
