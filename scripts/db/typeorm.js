#!/usr/bin/env node

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');

loadEnv();

const action = process.argv[2] || 'run';
const extraArgs = process.argv.slice(3);

const supportedActions = new Set(['run', 'revert', 'show', 'generate']);
if (!supportedActions.has(action)) {
  console.error(`Unsupported migration action: ${action}`);
  process.exit(1);
}

const connection = resolveConnection();

checkConnection(connection)
  .then(() => runTypeOrm(action, extraArgs))
  .catch((error) => {
    printConnectionError(connection, error);
    process.exit(1);
  });

function loadEnv() {
  const envPaths =
    (process.env.NODE_ENV || '').toLowerCase() === 'production'
      ? [path.join(process.cwd(), '.env')]
      : [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')];

  for (const candidate of envPaths) {
    if (!fs.existsSync(candidate)) continue;

    try {
      require('dotenv').config({ path: candidate });
      break;
    } catch (error) {
      console.error(`Failed to load env file: ${candidate}`);
      console.error(error.message);
      process.exit(1);
    }
  }
}

function resolveConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      database: parsed.pathname.replace(/^\//, '') || 'postgres',
      mode: 'url',
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_DATABASE || 'db_commune_tuyphuoc',
    mode: 'env',
  };
}

function checkConnection(connection) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      { host: connection.host, port: connection.port },
      () => {
        socket.end();
        resolve();
      },
    );

    socket.setTimeout(1500);
    socket.once('error', reject);
    socket.once('timeout', () => {
      socket.destroy(new Error('Connection timeout'));
    });
  });
}

function runTypeOrm(actionName, args) {
  const cliArgs = [
    'ts-node',
    '-r',
    'tsconfig-paths/register',
    './node_modules/typeorm/cli.js',
    `migration:${actionName}`,
    '-d',
    'src/config/database.config.ts',
  ];

  if (actionName === 'generate' && args.length > 0) {
    cliArgs.push(args[0]);
    cliArgs.push(...args.slice(1));
  } else {
    cliArgs.push(...args);
  }

  const result = spawnSync('npx', cliArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status || 0);
}

function printConnectionError(connection, error) {
  console.error(`Database connection failed: ${connection.host}:${connection.port}/${connection.database}`);
  console.error(error && error.message ? error.message : String(error));

  if (connection.mode === 'url') {
    console.error('DATABASE_URL is active. Check Neon host reachability, SSL settings, and internet connectivity.');
    return;
  }

  if (connection.host === 'localhost') {
    console.error('Local PostgreSQL is not running or not exposed on port 5432.');
    console.error('Run `npm run db:up` to start the local Docker postgres service.');
    console.error('If you use a custom local DB, create `.env.local` from `.env.local.example` and adjust the values.');
  } else {
    console.error('Check DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, and DB_PASSWORD.');
  }
}
