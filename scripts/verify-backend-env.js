/**
 * Verify dotenv, DB config, migrations, and security tests.
 * Usage: node scripts/verify-backend-env.js
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

function runNpm(script) {
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    shell: true,
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

async function main() {
  section('1. Environment file');
  if (!fs.existsSync(ENV_PATH)) {
    console.error('MISSING: .env not found at', ENV_PATH);
    console.error('Run: node scripts/setup-env.js');
    process.exit(1);
  }
  console.log('OK: .env exists at', ENV_PATH);

  delete require.cache[require.resolve('../config')];
  const dotenvResult = require('dotenv').config({ path: ENV_PATH });
  if (dotenvResult.error) {
    console.error('FAIL: dotenv could not load .env:', dotenvResult.error.message);
    process.exit(1);
  }
  console.log('OK: dotenv loaded', Object.keys(dotenvResult.parsed || {}).length, 'variables');

  section('2. Database configuration');
  const { getDbConfig } = require('../config');
  const required = [
    ['DB_HOST', process.env.DB_HOST || process.env.MYSQLHOST],
    ['DB_USER', process.env.DB_USER || process.env.MYSQLUSER],
    ['DB_NAME', process.env.DB_NAME || process.env.MYSQLDATABASE],
  ];
  const missing = required.filter(([, v]) => v == null || v === '').map(([k]) => k);
  if (process.env.DB_PASSWORD === undefined && process.env.MYSQLPASSWORD === undefined) {
    missing.push('DB_PASSWORD (set to empty string if no password: DB_PASSWORD=)');
  }

  if (missing.length) {
    console.error('FAIL: Missing database variables:', missing.join(', '));
    console.error('\nTroubleshooting:');
    console.error('  1. Run: node scripts/setup-env.js');
    console.error('  2. Edit .env and set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD');
    console.error('  3. Ensure MySQL is running on the configured host/port');
    process.exit(1);
  }

  const dbConfig = getDbConfig();
  if (!dbConfig) {
    console.error('FAIL: getDbConfig() returned null.');
    console.error('Set DB_HOST, DB_USER, DB_NAME, and DB_PASSWORD= (even if empty) in .env');
    process.exit(1);
  }

  console.log('OK: DB config detected');
  console.log('     host:', dbConfig.host);
  console.log('     port:', dbConfig.port);
  console.log('     database:', dbConfig.database);
  console.log('     user:', dbConfig.user);
  console.log('     password:', dbConfig.password === '' ? '(empty)' : '(set)');

  section('3. MySQL connection test');
  const mysql = require('mysql2/promise');
  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectTimeout: 10000,
    });
    await conn.query('SELECT 1 AS ok');
    console.log('OK: Connected to MySQL');
  } catch (err) {
    console.error('\nFAIL: MySQL connection error:', err.message);
    console.error('Code:', err.code || 'n/a');
    console.error('\nTroubleshooting:');
    if (err.code === 'ER_BAD_DB_ERROR') {
      console.error(`  • Database "${dbConfig.database}" does not exist.`);
      console.error(`  • Run: CREATE DATABASE ${dbConfig.database};`);
    } else if (err.code === 'ECONNREFUSED') {
      console.error('  • MySQL server not reachable — start the MySQL service.');
      console.error(`  • Check DB_HOST=${dbConfig.host} DB_PORT=${dbConfig.port}`);
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  • Access denied — set DB_PASSWORD in .env (empty root password: DB_PASSWORD=)');
      console.error(`  • Current: DB_USER=${dbConfig.user}`);
    } else {
      console.error('  • Verify .env DB_* values and MySQL user permissions.');
    }
    section('4–5. Migrations (skipped — fix MySQL first)');
    console.log('SKIP: migrate:payments and migrate:security require a working DB connection.');

    section('6. Security tests (no DB required)');
    const testOk = runNpm('test:security');
    console.log(testOk ? 'OK: test:security (all passed)' : 'FAIL: test:security');

    section('Summary');
    console.log('Env file: OK | DB config: OK | MySQL: FAIL | Migrations: SKIPPED');
    console.log(testOk ? 'Security tests: OK' : 'Security tests: FAIL');
    console.log('\nNext: set DB_PASSWORD in .env (if required), create database thumbs_up, then re-run:');
    console.log('  npm run verify:env');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }

  section('4. Migration: payments (002)');
  const payOk = runNpm('migrate:payments');
  console.log(payOk ? 'OK: migrate:payments' : 'FAIL: migrate:payments (see errors above)');

  section('5. Migration: security (003)');
  const secOk = runNpm('migrate:security');
  console.log(secOk ? 'OK: migrate:security' : 'FAIL: migrate:security (see errors above)');

  section('6. Security tests');
  const testOk = runNpm('test:security');
  console.log(testOk ? 'OK: test:security (all passed)' : 'FAIL: test:security');

  section('Summary');
  console.log('Env loaded: OK');
  console.log('DB config: OK (' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database + ')');
  console.log('MySQL connection: OK');
  console.log('migrate:payments:', payOk ? 'OK' : 'FAIL');
  console.log('migrate:security:', secOk ? 'OK' : 'FAIL');
  console.log('test:security:', testOk ? 'OK' : 'FAIL');
  if (payOk && secOk && testOk) {
    console.log('\nAll checks passed. Backend .env is ready for local development.');
    process.exit(0);
  }
  console.log('\nSome steps failed. Fix issues above before starting the server.');
  process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err.stack || err.message);
  process.exit(1);
});
