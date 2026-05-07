import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { UpsertDiscordServerInput } from '../dto/MessagingDto.js';
import type { DiscordGatewayFactory } from '../ports/DiscordGateway.js';
import type { MessagingWriteRepository } from '../../infrastructure/persistence/typeorm/MessagingWriteRepository.js';

function normalizeBotToken(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/^Bot\s+/i, '');
  return normalized.length > 0 ? normalized : null;
}

export class UpsertDiscordServerUseCase {
  constructor(
    private readonly messagingWriteRepository: MessagingWriteRepository,
    private readonly discordGatewayFactory: DiscordGatewayFactory,
  ) {}

  async execute(teacherId: number, classId: number, input: UpsertDiscordServerInput) {
    const existing = await this.messagingWriteRepository.findDiscordServerByClass(teacherId, classId);
    const discordServerId = input.discord_server_id.trim();
    const providedBotToken = normalizeBotToken(input.bot_token);
    const botToken = providedBotToken ?? normalizeBotToken(existing?.bot_token) ?? null;

    if (!botToken) {
      throw new ServiceError('bot_token is required', 400);
    }

    const discord = this.discordGatewayFactory.create(botToken);
    const guild = await discord.fetchGuildMetadata(discordServerId);
    const syncedServerId = guild.id.trim();
    const syncedName = guild.name;
    const attendanceVoiceChannelId = input.attendance_voice_channel_id?.trim() || null;
    const notificationChannelId = input.notification_channel_id?.trim() || null;

    if (attendanceVoiceChannelId) {
      await discord.ensureChannelBelongsToGuild({
        channelId: attendanceVoiceChannelId,
        guildId: syncedServerId,
        fieldName: 'attendance_voice_channel_id',
      });
    }

    if (notificationChannelId) {
      await discord.ensureChannelBelongsToGuild({
        channelId: notificationChannelId,
        guildId: syncedServerId,
        fieldName: 'notification_channel_id',
      });
    }

    if (existing) {
      existing.discord_server_id = syncedServerId;
      existing.bot_token = botToken;
      existing.name = syncedName;
      existing.attendance_voice_channel_id = attendanceVoiceChannelId;
      existing.notification_channel_id = notificationChannelId;
      return this.messagingWriteRepository.saveDiscordServer(existing);
    }

    const server = this.messagingWriteRepository.createDiscordServer({
      teacher_id: teacherId,
      class_id: classId,
      discord_server_id: syncedServerId,
      bot_token: botToken,
      name: syncedName,
      attendance_voice_channel_id: attendanceVoiceChannelId,
      notification_channel_id: notificationChannelId,
    });

    return this.messagingWriteRepository.saveDiscordServer(server);
  }
}
