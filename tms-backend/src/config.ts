function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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
    allowPublicRegistration: parseBoolean(process.env.AUTH_ALLOW_PUBLIC_REGISTRATION, false),
    sysAdminUsername: process.env.SYSADMIN_USERNAME ?? 'admin',
    sysAdminPassword: parseOptionalString(process.env.SYSADMIN_PASSWORD),
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
  autoSync: {
    enabled: parseBoolean(process.env.AUTO_SYNC_ENABLED, true),
    intervalMinutes: parsePositiveInteger(process.env.AUTO_SYNC_INTERVAL_MINUTES, 30),
    syncDiscord: parseBoolean(process.env.AUTO_SYNC_DISCORD_ENABLED, true),
    syncCodeforces: parseBoolean(process.env.AUTO_SYNC_CODEFORCES_ENABLED, true),
  },
  voiceAttendanceSync: {
    enabled: parseBoolean(process.env.VOICE_ATTENDANCE_SYNC_ENABLED, true),
    intervalSeconds: parsePositiveInteger(process.env.VOICE_ATTENDANCE_SYNC_INTERVAL_SECONDS, 15),
  },
  sessionStatusSync: {
    enabled: parseBoolean(process.env.SESSION_STATUS_SYNC_ENABLED, true),
    intervalSeconds: parsePositiveInteger(process.env.SESSION_STATUS_SYNC_INTERVAL_SECONDS, 15),
  },
};

export default config;
