import type { DataSource } from 'typeorm';

import { DiscordClient } from '../../../../../integrations/discord/discord-api.service.js';
import { DiscordRecipientResolver } from '../../../../../integrations/discord/discord-recipient-resolver.js';
import type { StudentCommunityPort } from '../../../application/ports/StudentCommunityPort.js';
import {
  findDiscordServerByClass,
  findLastEnrollment,
  findRecentEnrollments,
} from './EnrollmentDataAccess.js';
import { Student } from './StudentOrmEntity.js';

export class TypeOrmStudentCommunityPort implements StudentCommunityPort {
  constructor(private readonly dataSource: DataSource) {}

  async onStudentWithdrawn(teacherId: number, studentId: number): Promise<void> {
    const student = await this.dataSource.manager.getRepository(Student).findOneBy({ id: studentId });
    if (!student?.discord_username) {
      return;
    }

    const lastEnrollment = await findLastEnrollment(this.dataSource.manager, teacherId, studentId);
    if (!lastEnrollment) {
      return;
    }

    const server = await findDiscordServerByClass(this.dataSource.manager, teacherId, lastEnrollment.class_id);
    if (!server?.bot_token) {
      return;
    }

    const resolvedRecipient = await new DiscordRecipientResolver().resolve(server, student.discord_username);
    if (!resolvedRecipient.userId) {
      return;
    }

    await new DiscordClient(server.bot_token).kickGuildMember({
      guildId: server.discord_server_id,
      userId: resolvedRecipient.userId,
    });
  }

  async onStudentTransferred(
    teacherId: number,
    studentId: number,
    newClassId: number,
  ): Promise<void> {
    const student = await this.dataSource.manager.getRepository(Student).findOneBy({ id: studentId });
    if (!student?.discord_username) {
      return;
    }

    const recipientResolver = new DiscordRecipientResolver();
    const enrollments = await findRecentEnrollments(this.dataSource.manager, teacherId, studentId, 2);
    const oldEnrollment = enrollments.length >= 2 ? enrollments[1] : null;

    if (oldEnrollment) {
      const oldServer = await findDiscordServerByClass(this.dataSource.manager, teacherId, oldEnrollment.class_id);
      if (oldServer?.bot_token) {
        const resolvedRecipient = await recipientResolver.resolve(oldServer, student.discord_username);
        if (resolvedRecipient.userId) {
          try {
            await new DiscordClient(oldServer.bot_token).kickGuildMember({
              guildId: oldServer.discord_server_id,
              userId: resolvedRecipient.userId,
            });
          } catch {
          }
        }
      }
    }

    const newServer = await findDiscordServerByClass(this.dataSource.manager, teacherId, newClassId);
    if (!newServer?.bot_token) {
      return;
    }

    const channelId = newServer.notification_channel_id ?? newServer.attendance_voice_channel_id;
    if (!channelId) {
      return;
    }

    try {
      const discord = new DiscordClient(newServer.bot_token);
      const invite = await discord.createGuildInvite({
        channelId,
        maxAge: 86400 * 7,
        maxUses: 1,
      });
      const resolvedRecipient = await recipientResolver.resolve(newServer, student.discord_username);
      if (!resolvedRecipient.userId) {
        return;
      }

      await discord.sendDirectMessage({
        recipientUserId: resolvedRecipient.userId,
        content: `Ban da duoc chuyen lop. Vui long tham gia server Discord moi: ${invite.url}`,
      });
    } catch {
    }
  }
}
