import { DiscordMessageType } from '../../../../entities/enums.js';
import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { ChannelPostInput } from '../dto/MessagingDto.js';
import type { DiscordGatewayFactory } from '../ports/DiscordGateway.js';
import type { MessagingWriteRepository } from '../../infrastructure/persistence/typeorm/MessagingWriteRepository.js';

function normalizeIdArray(values: number[] | undefined): number[] {
  if (!values) {
    return [];
  }

  return Array.from(new Set(values.filter((item) => Number.isInteger(item) && item > 0)));
}

function toFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof ServiceError) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export class SendChannelPostUseCase {
  constructor(
    private readonly messagingWriteRepository: MessagingWriteRepository,
    private readonly discordGatewayFactory: DiscordGatewayFactory,
  ) {}

  async execute(teacherId: number, input: ChannelPostInput) {
    const { content } = input;
    const serverIds = normalizeIdArray(input.server_ids);
    const servers = await this.messagingWriteRepository.findDiscordServersByIds(teacherId, serverIds);

    if (servers.length !== serverIds.length) {
      throw new ServiceError('some servers are invalid', 404);
    }

    const serverById = new Map(servers.map((server) => [server.id, server]));
    const orderedServers = serverIds
      .map((serverId) => serverById.get(serverId))
      .filter((item): item is NonNullable<typeof item> => item !== undefined);

    const successfulServers: typeof orderedServers = [];
    const failures: Array<{ server_id: number; error: string }> = [];

    for (const server of orderedServers) {
      if (!server.bot_token) {
        failures.push({ server_id: server.id, error: 'bot_token is missing' });
        continue;
      }

      if (!server.notification_channel_id) {
        failures.push({ server_id: server.id, error: 'notification_channel_id is missing' });
        continue;
      }

      try {
        const discord = this.discordGatewayFactory.create(server.bot_token);
        await discord.ensureChannelBelongsToGuild({
          channelId: server.notification_channel_id,
          guildId: server.discord_server_id,
          fieldName: 'notification_channel_id',
        });
        await discord.postChannelMessage({
          channelId: server.notification_channel_id,
          content,
        });
        successfulServers.push(server);
      } catch (error) {
        failures.push({
          server_id: server.id,
          error: toFailureMessage(error, 'failed to send message'),
        });
      }
    }

    const savedMessages = successfulServers.length === 0
      ? []
      : await this.messagingWriteRepository.createChannelPostMessages(
        successfulServers.map((server) => ({
          teacher_id: teacherId,
          type: DiscordMessageType.ChannelPost,
          content,
          server_id: server.id,
        })),
      );

    return {
      messages: savedMessages,
      targets_total: orderedServers.length,
      sent: savedMessages.length,
      failed: failures.length,
      failures,
    };
  }
}
