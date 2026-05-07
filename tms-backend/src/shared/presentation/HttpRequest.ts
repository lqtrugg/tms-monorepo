export type HttpRequest<TBody = unknown, TParams = unknown, TQuery = unknown, TUser = unknown> = {
  body: TBody;
  params: TParams;
  query: TQuery;
  user?: TUser;
  headers: Record<string, string | string[] | undefined>;
};
