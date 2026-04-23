import express from 'express';

import config from './config.js';
import { authRouter } from './controllers/auth.controller.js';
import { classRouter } from './controllers/class.controller.js';
import { studentRouter } from './controllers/student.controller.js';
import { AppDataSource, initializeDatabase } from './data-source.js';
import { configurePassport } from './services/auth.passport.js';

const app = express();
const passport = configurePassport();

app.use(express.json());
app.use(passport.initialize());

app.get(`${config.apiPrefix}/health`, (_req, res) => {
  res.json({ ok: true, database: AppDataSource.isInitialized });
});

app.use(config.apiPrefix, authRouter);
app.use(config.apiPrefix, classRouter);
app.use(config.apiPrefix, studentRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'internal server error' });
});

app.use((_req, res) => {
  res.status(404).send('Not found');
});

async function main(): Promise<void> {
  await initializeDatabase();

  const server = config.host ? app.listen(config.port, config.host) : app.listen(config.port);

  server.on('listening', () => {
    console.log(`Backend server running at http://${config.host}:${config.port}`);
    console.log('Postgres schema refresh is enabled');
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error(`Failed to start backend server: ${error.message}`);
    process.exit(1);
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.log(`Received ${signal}, shutting down backend server`);

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
