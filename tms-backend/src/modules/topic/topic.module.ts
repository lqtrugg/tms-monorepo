import { AppDataSource } from '../../data-source.js';
import type { AppModule } from '../module.types.js';
import { AddTopicProblemUseCase } from './application/commands/AddTopicProblemUseCase.js';
import { CloseTopicUseCase } from './application/commands/CloseTopicUseCase.js';
import { CreateTopicUseCase } from './application/commands/CreateTopicUseCase.js';
import { UpsertTopicStandingUseCase } from './application/commands/UpsertTopicStandingUseCase.js';
import { TopicReadService } from './application/queries/TopicReadService.js';
import { DefaultCodeforcesGatewayFactory } from './infrastructure/codeforces/DefaultCodeforcesGatewayFactory.js';
import { TopicOrmEntity } from './infrastructure/persistence/typeorm/TopicOrmEntity.js';
import { TopicProblemOrmEntity } from './infrastructure/persistence/typeorm/TopicProblemOrmEntity.js';
import { TopicStandingOrmEntity } from './infrastructure/persistence/typeorm/TopicStandingOrmEntity.js';
import { TypeOrmTopicReadRepository } from './infrastructure/persistence/typeorm/TypeOrmTopicReadRepository.js';
import { TypeOrmTopicWriteRepository } from './infrastructure/persistence/typeorm/TypeOrmTopicWriteRepository.js';
import { TopicController } from './presentation/controllers/TopicController.js';
import { TopicStandingReportController } from './presentation/controllers/TopicStandingReportController.js';
import { createTopicStandingReportRouter } from './presentation/routes/topic-standing-report.routes.js';
import { createTopicRouter } from './presentation/routes/topic.routes.js';
const topicReadService = new TopicReadService(new TypeOrmTopicReadRepository());
const codeforcesGatewayFactory = new DefaultCodeforcesGatewayFactory();
const topicControllerDependencies = {
  listTopics: (teacherId: number, filters: Parameters<TopicReadService['listTopics']>[1]) =>
    topicReadService.listTopics(teacherId, filters),
  createTopic: (teacherId: number, input: Parameters<CreateTopicUseCase['execute']>[1]) =>
    AppDataSource.transaction((manager) =>
      new CreateTopicUseCase(
        new TypeOrmTopicWriteRepository(manager),
        codeforcesGatewayFactory,
      ).execute(teacherId, input)),
  closeTopic: (teacherId: number, topicId: number) =>
    AppDataSource.transaction((manager) =>
      new CloseTopicUseCase(new TypeOrmTopicWriteRepository(manager)).execute(teacherId, topicId)),
  addTopicProblem: (
    teacherId: number,
    topicId: number,
    input: Parameters<AddTopicProblemUseCase['execute']>[2],
  ) => AppDataSource.transaction((manager) =>
    new AddTopicProblemUseCase(new TypeOrmTopicWriteRepository(manager)).execute(teacherId, topicId, input)),
  upsertTopicStanding: (
    teacherId: number,
    topicId: number,
    input: Parameters<UpsertTopicStandingUseCase['execute']>[2],
  ) => AppDataSource.transaction((manager) =>
    new UpsertTopicStandingUseCase(new TypeOrmTopicWriteRepository(manager)).execute(
      teacherId,
      topicId,
      input,
    )),
};

const topicRouter = createTopicRouter({
  listTopics: new TopicController('listTopics', topicControllerDependencies),
  createTopic: new TopicController('createTopic', topicControllerDependencies),
  closeTopic: new TopicController('closeTopic', topicControllerDependencies),
  addTopicProblem: new TopicController('addTopicProblem', topicControllerDependencies),
  upsertTopicStanding: new TopicController('upsertTopicStanding', topicControllerDependencies),
});
const topicStandingReportRouter = createTopicStandingReportRouter(
  new TopicStandingReportController({
    getTopicStandingMatrix: (teacherId, topicId) => topicReadService.getTopicStandingMatrix(teacherId, topicId),
  }),
);

export const topicModule: AppModule = {
  name: 'topic',
  entities: [TopicOrmEntity, TopicProblemOrmEntity, TopicStandingOrmEntity],
  routes: [
    { path: '/', router: topicRouter },
    { path: '/', router: topicStandingReportRouter },
  ],
};
