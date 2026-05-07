import { ServiceError } from '../../../../shared/errors/service.error.js';
import { DiscordClient } from '../../../../integrations/discord/discord-api.service.js';
import type { DiscordGateway, DiscordGatewayFactory } from '../../application/ports/DiscordGateway.js';

class DiscordClientGateway implements DiscordGateway {
  constructor(private readonly discordClient: DiscordClient) {}

  listGuilds() {
    return this.discordClient.listGuilds();
  }

  fetchGuildMetadata(discordServerId: string) {
    return this.discordClient.fetchGuildMetadata(discordServerId);
  }

  listGuildChannels(guildId: string) {
    return this.discordClient.listGuildChannels(guildId);
  }

  ensureChannelBelongsToGuild(input: {
    channelId: string;
    guildId: string;
    fieldName: string;
  }) {
    return this.discordClient.ensureChannelBelongsToGuild(input);
  }

  sendDirectMessage(input: { recipientUserId: string; content: string }) {
    return this.discordClient.sendDirectMessage(input);
  }

  postChannelMessage(input: { channelId: string; content: string }) {
    return this.discordClient.postChannelMessage(input);
  }
}

export class DefaultDiscordGatewayFactory implements DiscordGatewayFactory {
  constructor(private readonly defaultBotToken: string | null | undefined = null) {}

  create(botToken?: string | null): DiscordGateway {
    const resolvedBotToken = botToken?.trim() || this.defaultBotToken?.trim() || null;
    if (!resolvedBotToken) {
      throw new ServiceError('discord bot is not configured by sysadmin', 503);
    }

    return new DiscordClientGateway(new DiscordClient(resolvedBotToken));
  }
}
