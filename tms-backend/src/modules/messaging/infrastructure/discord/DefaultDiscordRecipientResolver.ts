import { DiscordRecipientResolver } from '../../../../integrations/discord/discord-recipient-resolver.js';
import type {
  DiscordRecipientResolverPort,
  DiscordServerContext,
} from '../../application/ports/DiscordRecipientResolverPort.js';

export class DefaultDiscordRecipientResolver implements DiscordRecipientResolverPort {
  constructor(private readonly discordRecipientResolver = new DiscordRecipientResolver()) {}

  resolve(server: DiscordServerContext, discordUsername: string | null) {
    return this.discordRecipientResolver.resolve(server, discordUsername);
  }
}
