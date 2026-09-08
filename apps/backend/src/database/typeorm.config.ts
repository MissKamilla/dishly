import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

export type GetRequiredEnv = (name: string) => string;

export function createDatabaseOptions(
  getRequiredEnv: GetRequiredEnv,
): DataSourceOptions {
  const port = parsePort(getRequiredEnv('DB_PORT'), 'DB_PORT');

  return {
    type: 'postgres',
    host: getRequiredEnv('DB_HOST'),
    port,
    database: getRequiredEnv('DB_NAME'),
    username: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    migrationsTableName: 'migrations',
    synchronize: false,
  };
}

export function createRuntimeDatabaseOptions(
  getRequiredEnv: GetRequiredEnv,
): TypeOrmModuleOptions {
  return {
    ...createDatabaseOptions(getRequiredEnv),
    autoLoadEntities: true,
  };
}

function parsePort(value: string, name: string): number {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }

  return port;
}
