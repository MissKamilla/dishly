import 'reflect-metadata';

import { join } from 'node:path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { createDatabaseOptions } from './typeorm.config';

config();

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export default new DataSource({
  ...createDatabaseOptions(getRequiredEnv),
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
});
