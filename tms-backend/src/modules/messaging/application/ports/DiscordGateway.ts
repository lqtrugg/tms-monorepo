export type DiscordGuildMetadata = {
  id: string;
  name: string;
};

export type DiscordChannelOwnershipCheck = {
  channelId: string;
  guildId: string;
  fieldName: string;
};

export type DirectMessagePayload = {
  recipientUserId: string;
  content: string;
};

export type ChannelMessagePayload = {
  channelId: string;
  content: string;
};

export interface DiscordGateway {
  fetchGuildMetadata(discordServerId: string): Promise<DiscordGuildMetadata>;
  ensureChannelBelongsToGuild(input: DiscordChannelOwnershipCheck): Promise<void>;
  sendDirectMessage(input: DirectMessagePayload): Promise<unknown>;
  postChannelMessage(input: ChannelMessagePayload): Promise<unknown>;
}

export interface DiscordGatewayFactory {
  create(botToken: string): DiscordGateway;
}
