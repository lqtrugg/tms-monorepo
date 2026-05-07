import { ServiceError } from '../../../../shared/errors/service.error.js';
import type { Controller } from '../../../../shared/presentation/Controller.js';
import type { HttpRequest } from '../../../../shared/presentation/HttpRequest.js';
import type { HttpResponse } from '../../../../shared/presentation/HttpResponse.js';
import type {
  BulkDmInput,
  ChannelPostInput,
  MessageListFilters,
  UpsertDiscordServerInput,
} from '../../application/dto/MessagingDto.js';
import { getClassId, getTeacherId } from './request-context.js';

type MessagingControllerAction =
  | 'listDiscordServers'
  | 'upsertDiscordServer'
  | 'deleteDiscordServer'
  | 'listMessages'
  | 'sendBulkDm'
  | 'sendChannelPost';

type MessagingControllerDependencies = {
  listDiscordServers(teacherId: number): Promise<unknown>;
  upsertDiscordServerByClass(
    teacherId: number,
    classId: number,
    input: UpsertDiscordServerInput,
  ): Promise<unknown>;
  deleteDiscordServer(teacherId: number, classId: number): Promise<unknown>;
  listMessages(teacherId: number, filters: MessageListFilters): Promise<unknown>;
  sendBulkDm(teacherId: number, input: BulkDmInput): Promise<unknown>;
  sendChannelPost(teacherId: number, input: ChannelPostInput): Promise<unknown>;
};

type MessagingHttpRequest = HttpRequest<
  UpsertDiscordServerInput | BulkDmInput | ChannelPostInput,
  { classId?: number },
  MessageListFilters
>;

export class MessagingController implements Controller {
  constructor(
    private readonly action: MessagingControllerAction,
    private readonly dependencies: MessagingControllerDependencies,
  ) {}

  async handle(request: MessagingHttpRequest): Promise<HttpResponse> {
    try {
      switch (this.action) {
        case 'listDiscordServers':
          return this.listDiscordServers(request);
        case 'upsertDiscordServer':
          return this.upsertDiscordServer(request);
        case 'deleteDiscordServer':
          return this.deleteDiscordServer(request);
        case 'listMessages':
          return this.listMessages(request);
        case 'sendBulkDm':
          return this.sendBulkDm(request);
        case 'sendChannelPost':
          return this.sendChannelPost(request);
      }
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw error;
    }
  }

  private async listDiscordServers(request: MessagingHttpRequest): Promise<HttpResponse> {
    const servers = await this.dependencies.listDiscordServers(getTeacherId(request));

    return {
      statusCode: 200,
      body: { servers },
    };
  }

  private async upsertDiscordServer(request: MessagingHttpRequest): Promise<HttpResponse> {
    const server = await this.dependencies.upsertDiscordServerByClass(
      getTeacherId(request),
      getClassId(request),
      request.body as UpsertDiscordServerInput,
    );

    return {
      statusCode: 200,
      body: { server },
    };
  }

  private async deleteDiscordServer(request: MessagingHttpRequest): Promise<HttpResponse> {
    const result = await this.dependencies.deleteDiscordServer(
      getTeacherId(request),
      getClassId(request),
    );

    return {
      statusCode: 200,
      body: result,
    };
  }

  private async listMessages(request: MessagingHttpRequest): Promise<HttpResponse> {
    const messages = await this.dependencies.listMessages(
      getTeacherId(request),
      (request.query ?? {}) as MessageListFilters,
    );

    return {
      statusCode: 200,
      body: { messages },
    };
  }

  private async sendBulkDm(request: MessagingHttpRequest): Promise<HttpResponse> {
    const result = await this.dependencies.sendBulkDm(
      getTeacherId(request),
      request.body as BulkDmInput,
    );

    return {
      statusCode: 201,
      body: result,
    };
  }

  private async sendChannelPost(request: MessagingHttpRequest): Promise<HttpResponse> {
    const result = await this.dependencies.sendChannelPost(
      getTeacherId(request),
      request.body as ChannelPostInput,
    );

    return {
      statusCode: 201,
      body: result,
    };
  }
}
