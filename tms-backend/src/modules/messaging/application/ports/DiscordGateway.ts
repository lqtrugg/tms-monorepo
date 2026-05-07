export type DiscordGuildMetadata = {
  id: string;
  name: string;
};

export type DiscordChannelOwnershipCheck = {
  channelId: string;
  guildId: string;
  fieldName: string;
};

export type DiscordGuildChannel = {
  id: string;
  name: string;
  type: 'text' | 'voice';
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
  listGuilds(): Promise<DiscordGuildMetadata[]>;
  fetchGuildMetadata(discordServerId: string): Promise<DiscordGuildMetadata>;
  listGuildChannels(guildId: string): Promise<DiscordGuildChannel[]>;
  ensureChannelBelongsToGuild(input: DiscordChannelOwnershipCheck): Promise<void>;
  sendDirectMessage(input: DirectMessagePayload): Promise<unknown>;
  postChannelMessage(input: ChannelMessagePayload): Promise<unknown>;
}

export interface DiscordGatewayFactory {
  create(botToken?: string | null): DiscordGateway;
}
