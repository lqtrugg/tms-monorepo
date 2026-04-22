export type AuthCredentials = {
  username: unknown;
  password: unknown;
};

export type AuthTeacher = {
  id: number;
  username: string;
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
