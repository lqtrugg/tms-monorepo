import { DiscordClient } from '../../../../integrations/discord/discord-api.service.js';
import type { DiscordGateway, DiscordGatewayFactory } from '../../application/ports/DiscordGateway.js';

class DiscordClientGateway implements DiscordGateway {
  constructor(private readonly discordClient: DiscordClient) {}

  fetchGuildMetadata(discordServerId: string) {
    return this.discordClient.fetchGuildMetadata(discordServerId);
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
  create(botToken: string): DiscordGateway {
    return new DiscordClientGateway(new DiscordClient(botToken));
  }
}
