import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { Controller } from '../../../../shared/presentation/Controller.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';
import type { HttpResponse } from '../../../../shared/presentation/HttpResponse.js';
import type {
  CreateTeacherByAdminInput,
  UpdateTeacherByAdminInput,
} from '../../application/dto/AdminDto.js';
import { AdminTeacherReadService } from '../../application/queries/AdminTeacherReadService.js';
import { getTeacher } from './request-context.js';

type AdminControllerAction = 'listTeachers' | 'createTeacher' | 'updateTeacher';

type AdminControllerDependencies = {
  readService: AdminTeacherReadService;
  createTeacher: { execute(input: CreateTeacherByAdminInput): Promise<unknown> };
  updateTeacher: {
    execute(actorTeacherId: number, teacherId: number, input: UpdateTeacherByAdminInput): Promise<unknown>;
  };
};

export class AdminController implements Controller {
  constructor(
    private readonly action: AdminControllerAction,
    private readonly dependencies: AdminControllerDependencies,
  ) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      switch (this.action) {
        case 'listTeachers':
          return this.listTeachers();
        case 'createTeacher':
          return this.createTeacher(request);
        case 'updateTeacher':
          return this.updateTeacher(request);
      }
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw error;
    }
  }

  private async listTeachers(): Promise<HttpResponse> {
    const teachers = await this.dependencies.readService.listTeachers();

    return {
      statusCode: 200,
      body: { teachers },
    };
  }

  private async createTeacher(request: HttpRequest): Promise<HttpResponse> {
    const teacher = await this.dependencies.createTeacher.execute(request.body as CreateTeacherByAdminInput);

    return {
      statusCode: 201,
      body: { teacher },
    };
  }

  private async updateTeacher(request: HttpRequest): Promise<HttpResponse> {
    const actorTeacherId = getTeacher(request).id;
    const teacherId = (request.params as { teacherId?: number }).teacherId;

    if (typeof teacherId !== 'number') {
      throw new ServiceError('teacherId is required', 400);
    }

    const teacher = await this.dependencies.updateTeacher.execute(
      actorTeacherId,
      teacherId,
      request.body as UpdateTeacherByAdminInput,
    );

    return {
      statusCode: 200,
      body: { teacher },
    };
  }
}
