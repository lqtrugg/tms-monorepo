import type { AppModule } from '../module.types.js';
import { DiscordMessageRecipient } from './domain/discord-message-recipient.entity.js';
import { DiscordMessage } from './domain/discord-message.entity.js';
import { DiscordServer } from './domain/discord-server.entity.js';
import { messagingRouter } from './index.js';

export const messagingModule: AppModule = {
  name: 'messaging',
  entities: [DiscordServer, DiscordMessage, DiscordMessageRecipient],
  routes: [{ path: '/', router: messagingRouter }],
};
