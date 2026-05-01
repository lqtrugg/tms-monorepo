import express from 'express';

import config from './config.js';
import { AppDataSource, initializeDatabase } from './data-source.js';
import {
  attendanceRouter,
  classRouter,
  startSessionStatusSync,
  startVoiceAttendanceSync,
  stopSessionStatusSync,
  stopVoiceAttendanceSync,
  studentRouter,
} from './modules/academic/index.js';
import {
  adminRouter,
  authRouter,
  configurePassport,
  ensureSystemAdminAccount,
} from './modules/identity/index.js';
import { financeRouter } from './modules/finance/index.js';
import { messagingRouter } from './modules/messaging/index.js';
import { reportingRouter } from './modules/reporting/index.js';
import { startAutoSyncScheduler, stopAutoSyncScheduler, topicRouter } from './modules/training/index.js';

const app = express();
const passport = configurePassport();

app.use(express.json());
app.use(passport.initialize());

app.get(`${config.apiPrefix}/health`, (_req, res) => {
  res.json({ ok: true, database: AppDataSource.isInitialized });
});

app.use(config.apiPrefix, authRouter);
app.use(`${config.apiPrefix}/admin`, adminRouter);
app.use(config.apiPrefix, classRouter);
app.use(config.apiPrefix, studentRouter);
app.use(config.apiPrefix, attendanceRouter);
app.use(config.apiPrefix, financeRouter);
app.use(config.apiPrefix, topicRouter);
app.use(config.apiPrefix, messagingRouter);
app.use(config.apiPrefix, reportingRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'internal server error' });
});

app.use((_req, res) => {
  res.status(404).send('Not found');
});

async function main(): Promise<void> {
  await initializeDatabase();
  await ensureSystemAdminAccount();

  if (config.autoSync.enabled) {
    startAutoSyncScheduler({
      intervalSeconds: config.autoSync.intervalSeconds,
      syncDiscord: config.autoSync.syncDiscord,
      syncCodeforces: config.autoSync.syncCodeforces,
    });
  }

  if (config.sessionStatusSync.enabled) {
    startSessionStatusSync(config.sessionStatusSync.intervalSeconds * 1000);
  }

  if (config.voiceAttendanceSync.enabled) {
    startVoiceAttendanceSync(config.voiceAttendanceSync.intervalSeconds * 1000);
  }

  const server = config.host ? app.listen(config.port, config.host) : app.listen(config.port);

  server.on('listening', () => {
    console.log(`Backend server running at http://${config.host}:${config.port}`);
    console.log(
      `Database mode: synchronize=${String(config.database.synchronize)}, dropSchema=${String(config.database.dropSchema)}`,
    );
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`Failed to start backend server: ${error.message}`);
    process.exit(1);
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.log(`Received ${signal}, shutting down backend server`);
    stopAutoSyncScheduler();
    stopSessionStatusSync();
    stopVoiceAttendanceSync();

    server.close(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }

      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Failed to initialize backend server');
  console.error(error);
  process.exit(1);
});
