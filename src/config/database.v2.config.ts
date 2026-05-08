import { DataSource } from 'typeorm';
import { URL } from 'url';
import { join } from 'path';

try {
  require('dotenv').config({ path: join(process.cwd(), '.env') });
} catch {
  // no-op
}

function envBool(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = envBool(process.env.DB_SSL, false);
const rejectUnauthorized = envBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);

const baseOptions = {
  type: 'postgres' as const,
  synchronize: false,
  logging: envBool(process.env.DB_LOGGING, true),
  entities: [
    join(__dirname, '..', '**', '*.entity.ts'),
    join(__dirname, '..', '**', '*.entity.js'),
  ],
  migrations: [
    join(__dirname, '..', 'migrations', 'active', 'migration_v2', '*.ts'),
    join(__dirname, '..', 'migrations', 'active', 'migration_v2', '*.js'),
  ],
};

export default new DataSource(
  databaseUrl
    ? (() => {
        const u = new URL(databaseUrl);
        const dbName = u.pathname?.replace(/^\//, '') || 'postgres';

        return {
          ...baseOptions,
          host: u.hostname,
          port: u.port ? Number(u.port) : 5432,
          username: decodeURIComponent(u.username),
          password: decodeURIComponent(u.password),
          database: dbName,
          ssl: sslEnabled ? { rejectUnauthorized } : undefined,
        };
      })()
    : {
        ...baseOptions,
        host: process.env.DB_HOST ?? 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_DATABASE ?? 'db_commune_tuyphuoc_v2',
        ssl: sslEnabled ? { rejectUnauthorized } : undefined,
      },
);
