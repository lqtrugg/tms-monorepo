import type { Controller } from '../../../../shared/presentation/Controller.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';
import type { HttpResponse } from '../../../../shared/presentation/HttpResponse.js';
import { GetDashboardSummaryUseCase } from '../../application/queries/GetDashboardSummaryUseCase.js';
import { GetStudentLearningProfileUseCase } from '../../application/queries/GetStudentLearningProfileUseCase.js';
import { getStudentId, getTeacherId } from './request-context.js';

type StudentReportControllerAction = 'getDashboardSummary' | 'getStudentLearningProfile';

type StudentReportHttpRequest = HttpRequest<
  unknown,
  { studentId?: number },
  unknown
>;

export class StudentReportController implements Controller {
  constructor(
    private readonly action: StudentReportControllerAction,
    private readonly dependencies: {
      getDashboardSummary: GetDashboardSummaryUseCase;
      getStudentLearningProfile: GetStudentLearningProfileUseCase;
    },
  ) {}

  async handle(request: StudentReportHttpRequest): Promise<HttpResponse> {
    switch (this.action) {
      case 'getDashboardSummary': {
        const summary = await this.dependencies.getDashboardSummary.execute(getTeacherId(request));
        return {
          statusCode: 200,
          body: { summary },
        };
      }
      case 'getStudentLearningProfile': {
        const profile = await this.dependencies.getStudentLearningProfile.execute(
          getTeacherId(request),
          getStudentId(request),
        );
        return {
          statusCode: 200,
          body: profile,
        };
      }
    }
  }
}
