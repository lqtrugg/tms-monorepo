import type { AppModule } from '../module.types.js';
import { TopicProblem } from './domain/topic-problem.entity.js';
import { TopicStanding } from './domain/topic-standing.entity.js';
import { Topic } from './domain/topic.entity.js';
import { topicRouter, topicStandingReportRouter } from './index.js';

export const topicModule: AppModule = {
  name: 'topic',
  entities: [Topic, TopicProblem, TopicStanding],
  routes: [
    { path: '/', router: topicRouter },
    { path: '/', router: topicStandingReportRouter },
  ],
};
