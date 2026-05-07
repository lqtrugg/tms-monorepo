import type { AppModule } from '../module.types.js';
import { DeleteDiscordServerUseCase } from './application/commands/DeleteDiscordServerUseCase.js';
import { SendBulkDmUseCase } from './application/commands/SendBulkDmUseCase.js';
import { SendChannelPostUseCase } from './application/commands/SendChannelPostUseCase.js';
import { UpsertDiscordServerUseCase } from './application/commands/UpsertDiscordServerUseCase.js';
import { MessagingReadService } from './application/queries/MessagingReadService.js';
import { DefaultDiscordGatewayFactory } from './infrastructure/discord/DefaultDiscordGatewayFactory.js';
import { DefaultDiscordRecipientResolver } from './infrastructure/discord/DefaultDiscordRecipientResolver.js';
import { DiscordMessageRecipientOrmEntity } from './infrastructure/persistence/typeorm/DiscordMessageRecipientOrmEntity.js';
import { DiscordMessageOrmEntity } from './infrastructure/persistence/typeorm/DiscordMessageOrmEntity.js';
import { DiscordServerOrmEntity } from './infrastructure/persistence/typeorm/DiscordServerOrmEntity.js';
import { TypeOrmMessagingReadRepository } from './infrastructure/persistence/typeorm/TypeOrmMessagingReadRepository.js';
import { TypeOrmMessagingWriteRepository } from './infrastructure/persistence/typeorm/TypeOrmMessagingWriteRepository.js';
import { MessagingController } from './presentation/controllers/MessagingController.js';
import { createMessagingRouter } from './presentation/routes/messaging.routes.js';

const messagingReadService = new MessagingReadService(new TypeOrmMessagingReadRepository());
const messagingWriteRepository = new TypeOrmMessagingWriteRepository();
const discordGatewayFactory = new DefaultDiscordGatewayFactory();
const discordRecipientResolver = new DefaultDiscordRecipientResolver();
const upsertDiscordServerUseCase = new UpsertDiscordServerUseCase(
  messagingWriteRepository,
  discordGatewayFactory,
);
const deleteDiscordServerUseCase = new DeleteDiscordServerUseCase(messagingWriteRepository);
const sendBulkDmUseCase = new SendBulkDmUseCase(
  messagingWriteRepository,
  discordGatewayFactory,
  discordRecipientResolver,
);
const sendChannelPostUseCase = new SendChannelPostUseCase(
  messagingWriteRepository,
  discordGatewayFactory,
);
const messagingControllerDependencies = {
  listDiscordServers: (teacherId: number) => messagingReadService.listDiscordServers(teacherId),
  upsertDiscordServerByClass: (
    teacherId: number,
    classId: number,
    input: Parameters<UpsertDiscordServerUseCase['execute']>[2],
  ) => upsertDiscordServerUseCase.execute(teacherId, classId, input),
  deleteDiscordServer: (teacherId: number, classId: number) =>
    deleteDiscordServerUseCase.execute(teacherId, classId),
  listMessages: (
    teacherId: number,
    filters: Parameters<MessagingReadService['listMessages']>[1],
  ) => messagingReadService.listMessages(teacherId, filters),
  sendBulkDm: (teacherId: number, input: Parameters<SendBulkDmUseCase['execute']>[1]) =>
    sendBulkDmUseCase.execute(teacherId, input),
  sendChannelPost: (teacherId: number, input: Parameters<SendChannelPostUseCase['execute']>[1]) =>
    sendChannelPostUseCase.execute(teacherId, input),
};

const messagingRouter = createMessagingRouter({
  listDiscordServers: new MessagingController('listDiscordServers', messagingControllerDependencies),
  upsertDiscordServer: new MessagingController('upsertDiscordServer', messagingControllerDependencies),
  deleteDiscordServer: new MessagingController('deleteDiscordServer', messagingControllerDependencies),
  listMessages: new MessagingController('listMessages', messagingControllerDependencies),
  sendBulkDm: new MessagingController('sendBulkDm', messagingControllerDependencies),
  sendChannelPost: new MessagingController('sendChannelPost', messagingControllerDependencies),
});

export const messagingModule: AppModule = {
  name: 'messaging',
  entities: [DiscordServerOrmEntity, DiscordMessageOrmEntity, DiscordMessageRecipientOrmEntity],
  routes: [{ path: '/', router: messagingRouter }],
};
