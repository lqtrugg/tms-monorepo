import 'reflect-metadata';
import { DataSource } from 'typeorm';

import config from './config.js';
import { appEntities } from './entities/index.js';

const connectionOptions = {
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...connectionOptions,
  entities: appEntities,
  dropSchema: config.database.dropSchema,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
});

export async function initializeDatabase(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  return AppDataSource;
}
