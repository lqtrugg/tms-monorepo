import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { UpsertCommunityServerInput } from '../dto/MessagingDto.js';
import type { MessagingWriteRepository } from '../../infrastructure/persistence/typeorm/MessagingWriteRepository.js';

export class SelectCommunityServerUseCase {
  constructor(private readonly messagingWriteRepository: MessagingWriteRepository) {}

  async execute(teacherId: number, input: UpsertCommunityServerInput) {
    const serverCache = await this.messagingWriteRepository.findTeacherDiscordServerCacheById(
      teacherId,
      input.server_id,
    );

    if (!serverCache) {
      throw new ServiceError('selected server is invalid', 404);
    }

    const notificationChannel = input.notification_channel_id
      ? await this.messagingWriteRepository.findTeacherDiscordChannelCacheById(teacherId, Number(input.notification_channel_id))
      : null;
    const voiceChannel = input.voice_channel_id
      ? await this.messagingWriteRepository.findTeacherDiscordChannelCacheById(teacherId, Number(input.voice_channel_id))
      : null;

    if (notificationChannel && notificationChannel.discord_server_id !== serverCache.discord_server_id) {
      throw new ServiceError('notification channel does not belong to selected server', 400);
    }

    if (notificationChannel && notificationChannel.type !== 'text') {
      throw new ServiceError('notification channel must be a text channel', 400);
    }

    if (voiceChannel && voiceChannel.discord_server_id !== serverCache.discord_server_id) {
      throw new ServiceError('voice channel does not belong to selected server', 400);
    }

    if (voiceChannel && voiceChannel.type !== 'voice') {
      throw new ServiceError('voice channel must be a voice channel', 400);
    }

    const classBinding = await this.messagingWriteRepository.findDiscordServerByDiscordServerId(
      teacherId,
      serverCache.discord_server_id,
    );
    if (classBinding) {
      throw new ServiceError('selected server is already bound to a class', 409);
    }

    const existing = await this.messagingWriteRepository.findCommunityServerByTeacher(teacherId);
    if (existing) {
      existing.discord_server_id = serverCache.discord_server_id;
      existing.name = serverCache.name;
      existing.notification_channel_id = notificationChannel?.discord_channel_id ?? null;
      existing.voice_channel_id = voiceChannel?.discord_channel_id ?? null;
      existing.updated_at = new Date();
      return this.messagingWriteRepository.saveCommunityServer(existing);
    }

    return this.messagingWriteRepository.saveCommunityServer(
      this.messagingWriteRepository.createCommunityServer({
        teacher_id: teacherId,
        discord_server_id: serverCache.discord_server_id,
        name: serverCache.name,
        notification_channel_id: notificationChannel?.discord_channel_id ?? null,
        voice_channel_id: voiceChannel?.discord_channel_id ?? null,
      }),
    );
  }
}
