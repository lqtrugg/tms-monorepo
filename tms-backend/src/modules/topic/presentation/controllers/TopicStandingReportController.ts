import type { Controller } from '../../../../shared/presentation/Controller.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';
import type { HttpResponse } from '../../../../shared/presentation/HttpResponse.js';
import { getTeacherId, getTopicId } from './request-context.js';

type TopicStandingReportDependencies = {
  getTopicStandingMatrix(teacherId: number, topicId: number): Promise<unknown>;
};

export class TopicStandingReportController implements Controller {
  constructor(private readonly dependencies: TopicStandingReportDependencies) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    const matrix = await this.dependencies.getTopicStandingMatrix(
      getTeacherId(request),
      getTopicId(request),
    );

    return {
      statusCode: 200,
      body: matrix,
    };
  }
}
