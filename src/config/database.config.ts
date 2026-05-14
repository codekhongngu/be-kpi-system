import { DataSource } from 'typeorm';
import { URL } from 'url';
import { join } from 'path';
import { existsSync } from 'fs';

try {
  const envPaths =
    process.env.NODE_ENV === 'production'
      ? [join(process.cwd(), '.env')]
      : [join(process.cwd(), '.env.local'), join(process.cwd(), '.env')];

  for (const dotenvPath of envPaths) {
    if (!existsSync(dotenvPath)) continue;
    require('dotenv').config({ path: dotenvPath });
    break;
  }
} catch {
  // no-op
}

function envBool(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

const databaseUrl = process.env.DATABASE_URL || undefined;
const sslEnabled = envBool(process.env.DB_SSL, false);
const rejectUnauthorized = envBool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);

const baseOptions = {
  type: 'postgres' as const,
  synchronize: envBool(process.env.DB_SYNCHRONIZE, false),
  logging: envBool(process.env.DB_LOGGING, true),
  entities: [
    join(__dirname, '..', '**', '*.entity.ts'),
    join(__dirname, '..', '**', '*.entity.js'),
  ],
  migrations: [
    join(__dirname, '..', 'migrations', 'clean', '**', '*.ts'),
    join(__dirname, '..', 'migrations', 'clean', '**', '*.js'),
  ],
};

export default new DataSource(
  databaseUrl ? buildFromUrl(databaseUrl) : buildFromEnv(),
);

function buildFromUrl(databaseUrlValue: string) {
  const u = new URL(databaseUrlValue);
  const dbName = u.pathname.replace(/^\//, '') || 'postgres';

  return {
    ...baseOptions,
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    username: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: dbName,
    ssl: sslEnabled ? { rejectUnauthorized } : undefined,
  };
}

function buildFromEnv() {
  return {
    ...baseOptions,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'db_commune_tuyphuoc',
    ssl: sslEnabled ? { rejectUnauthorized } : undefined,
  };
}
