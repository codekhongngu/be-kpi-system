import { DataSource } from 'typeorm';
import { URL } from 'url';
import { join } from 'path';

// Load .env for TypeORM CLI runs (cross-platform).
// @nestjs/config depends on dotenv, so it's typically available.
// If dotenv isn't present, we fall back to process.env as-is.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: join(process.cwd(), '.env') });
} catch {
  // no-op
}

function envBool(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === null || value === '')
    return defaultValue;
  return String(value).toLowerCase() === 'true';
}

const databaseUrl = process.env.DATABASE_URL;
const sslEnabled = envBool(process.env.DB_SSL, false);
const rejectUnauthorized = envBool(
  process.env.DB_SSL_REJECT_UNAUTHORIZED,
  true,
);

const baseOptions = {
  type: 'postgres' as const,
  synchronize: envBool(process.env.DB_SYNCHRONIZE, false),
  logging: envBool(process.env.DB_LOGGING, true),
  entities: [
    join(__dirname, '..', '**', '*.entity.ts'),
    join(__dirname, '..', '**', '*.entity.js'),
  ],
  migrations: [
    join(__dirname, '..', 'migrations', '*.ts'),
    join(__dirname, '..', 'migrations', '*.js'),
  ],
  ssl: sslEnabled ? { rejectUnauthorized } : undefined,
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
        };
      })()
    : {
        ...baseOptions,
        host: process.env.DB_HOST ?? 'localhost',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_DATABASE ?? 'starter_db',
      },
);
