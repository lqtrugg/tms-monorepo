import type { Controller } from '../../../../shared/presentation/Controller.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';
import type { HttpResponse } from '../../../../shared/presentation/HttpResponse.js';
import type {
  AddTopicProblemInput,
  CreateTopicInput,
  TopicListQuery,
  UpsertTopicStandingInput,
} from '../../application/dto/TopicDto.js';
import { getTeacherId, getTopicId } from './request-context.js';

type TopicControllerAction =
  | 'listTopics'
  | 'createTopic'
  | 'closeTopic'
  | 'addTopicProblem'
  | 'upsertTopicStanding';

type TopicControllerDependencies = {
  listTopics(teacherId: number, filters: TopicListQuery): Promise<unknown>;
  createTopic(teacherId: number, input: CreateTopicInput): Promise<unknown>;
  closeTopic(teacherId: number, topicId: number): Promise<unknown>;
  addTopicProblem(teacherId: number, topicId: number, input: AddTopicProblemInput): Promise<unknown>;
  upsertTopicStanding(
    teacherId: number,
    topicId: number,
    input: UpsertTopicStandingInput,
  ): Promise<unknown>;
};

type TopicHttpRequest = HttpRequest<
  CreateTopicInput | AddTopicProblemInput | UpsertTopicStandingInput,
  { topicId?: number },
  TopicListQuery
>;

export class TopicController implements Controller {
  constructor(
    private readonly action: TopicControllerAction,
    private readonly dependencies: TopicControllerDependencies,
  ) {}

  async handle(request: TopicHttpRequest): Promise<HttpResponse> {
    switch (this.action) {
      case 'listTopics':
        return this.listTopics(request);
      case 'createTopic':
        return this.createTopic(request);
      case 'closeTopic':
        return this.closeTopic(request);
      case 'addTopicProblem':
        return this.addTopicProblem(request);
      case 'upsertTopicStanding':
        return this.upsertTopicStanding(request);
    }
  }

  private async listTopics(request: TopicHttpRequest): Promise<HttpResponse> {
    const topics = await this.dependencies.listTopics(
      getTeacherId(request),
      (request.query ?? {}) as TopicListQuery,
    );

    return { statusCode: 200, body: { topics } };
  }

  private async createTopic(request: TopicHttpRequest): Promise<HttpResponse> {
    const topic = await this.dependencies.createTopic(
      getTeacherId(request),
      request.body as CreateTopicInput,
    );

    return { statusCode: 201, body: { topic } };
  }

  private async closeTopic(request: TopicHttpRequest): Promise<HttpResponse> {
    const topic = await this.dependencies.closeTopic(getTeacherId(request), getTopicId(request));

    return { statusCode: 200, body: { topic } };
  }

  private async addTopicProblem(request: TopicHttpRequest): Promise<HttpResponse> {
    const problem = await this.dependencies.addTopicProblem(
      getTeacherId(request),
      getTopicId(request),
      request.body as AddTopicProblemInput,
    );

    return { statusCode: 201, body: { problem } };
  }

  private async upsertTopicStanding(request: TopicHttpRequest): Promise<HttpResponse> {
    const standing = await this.dependencies.upsertTopicStanding(
      getTeacherId(request),
      getTopicId(request),
      request.body as UpsertTopicStandingInput,
    );

    return { statusCode: 200, body: { standing } };
  }
}
