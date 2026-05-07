import { DiscordRecipientResolver } from '../../../../integrations/discord/discord-recipient-resolver.js';
import type {
  DiscordRecipientResolverPort,
  DiscordServerContext,
} from '../../application/ports/DiscordRecipientResolverPort.js';

export class DefaultDiscordRecipientResolver implements DiscordRecipientResolverPort {
  constructor(
    private readonly defaultBotToken: string | null | undefined = null,
    private readonly discordRecipientResolver = new DiscordRecipientResolver(),
  ) {}

  resolve(server: DiscordServerContext, discordUsername: string | null) {
    return this.discordRecipientResolver.resolve(
      {
        ...server,
        class_id: server.class_id ?? 0,
        bot_token: server.bot_token?.trim() || this.defaultBotToken?.trim() || null,
      },
      discordUsername,
    );
  }
}
