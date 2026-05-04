#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const composeTarget = process.argv[2];
const args = process.argv.slice(3);

const composeFiles = {
  dev: 'infra/docker/docker-compose.yml',
  prod: 'infra/docker/docker-compose.prod.yml',
};

if (!composeFiles[composeTarget]) {
  console.error("Usage: node scripts/docker/run.js <dev|prod> <docker-compose-args...>");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..', '..');
const composeFile = composeFiles[composeTarget];

const result = spawnSync('docker', ['compose', '-f', composeFile, ...args], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
