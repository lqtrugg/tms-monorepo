import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { Controller } from '../../../../shared/presentation/Controller.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';
import type { HttpResponse } from '../../../../shared/presentation/HttpResponse.js';
import type { IncomeReportFilters } from '../../application/dto/FinanceDto.js';
import { GetIncomeReportUseCase } from '../../application/queries/GetIncomeReportUseCase.js';
import { getTeacherId } from './request-context.js';

export class FinanceReportController implements Controller {
  constructor(private readonly getIncomeReportUseCase: GetIncomeReportUseCase) {}

  async handle(request: HttpRequest<unknown, unknown, IncomeReportFilters>): Promise<HttpResponse> {
    try {
      const report = await this.getIncomeReportUseCase.execute(getTeacherId(request), request.query ?? {});

      return {
        statusCode: 200,
        body: report,
      };
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw error;
    }
  }
}
