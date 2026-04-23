export type LoginInput = {
  username: unknown;
  password: unknown;
};

export type RegisterInput = {
  username: unknown;
  password: unknown;
  codeforces_handle: unknown;
  codeforces_api_key?: unknown;
  codeforces_api_secret?: unknown;
};

export type UpdateTeacherInput = {
  username?: unknown;
  password?: unknown;
  codeforces_handle?: unknown;
  codeforces_api_key?: unknown;
  codeforces_api_secret?: unknown;
};

export type AuthTeacher = {
  id: number;
  username: string;
  codeforces_handle: string | null;
  codeforces_api_key: string | null;
  codeforces_api_secret: string | null;
  created_at: Date;
};

export type AuthTokenPayload = {
  sub: number;
  username: string;
};

export type AuthTokenResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string | undefined;
  teacher: AuthTeacher;
};
