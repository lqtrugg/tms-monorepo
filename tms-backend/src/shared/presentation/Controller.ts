import type { HttpRequest } from './HttpRequest.js';
import type { HttpResponse } from './HttpResponse.js';

export interface Controller {
  handle(request: HttpRequest): Promise<HttpResponse>;
}
