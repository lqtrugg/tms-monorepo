function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

const config = {
  nodeEnv: process.env.NODE_ENV,
  host: process.env.HOST,
  port: Number(process.env.PORT),
  apiPrefix: process.env.API_PREFIX as string,
  auth: {
    jwtSecret: process.env.JWT_SECRET as string,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    jwtIssuer: process.env.JWT_ISSUER,
    jwtAudience: process.env.JWT_AUDIENCE,
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS),
  },
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    synchronize: parseBoolean(process.env.DB_SYNCHRONIZE, true),
    dropSchema: parseBoolean(process.env.DB_DROP_SCHEMA, false),
    logging: process.env.DB_LOGGING ? parseBoolean(process.env.DB_LOGGING, false) : undefined,
  },
};

export default config;
