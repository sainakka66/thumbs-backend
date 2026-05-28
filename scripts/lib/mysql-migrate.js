/**
 * MySQL 5.7 / 8 / MariaDB compatible migration runner.
 * - CREATE INDEX IF NOT EXISTS → INFORMATION_SCHEMA.STATISTICS check
 * - ADD COLUMN IF NOT EXISTS → INFORMATION_SCHEMA.COLUMNS check
 */
const fs = require('fs');

const SKIP_CODES = new Set([
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_TABLE_EXISTS_ERROR',
  'ER_DUP_ENTRY',
  'ER_CANT_DROP_FIELD_OR_KEY',
]);

const CREATE_INDEX_RE =
  /^CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s+ON\s+`?(\w+)`?\s*\(([^)]+)\)/i;

const ALTER_ADD_COLUMNS_RE =
  /^ALTER\s+TABLE\s+`?(\w+)`?\s+((?:ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?.+))$/is;

async function getSchemaName(conn) {
  const [rows] = await conn.query('SELECT DATABASE() AS db');
  return rows[0]?.db;
}

async function indexExists(conn, schema, table, indexName) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [schema, table, indexName]
  );
  return rows.length > 0;
}

async function columnExists(conn, schema, table, columnName) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [schema, table, columnName]
  );
  return rows.length > 0;
}

async function tableExists(conn, schema, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     LIMIT 1`,
    [schema, table]
  );
  return rows.length > 0;
}

async function ensureIndex(conn, schema, indexName, table, columnsExpr) {
  if (!(await tableExists(conn, schema, table))) {
    throw new Error(`Table \`${table}\` does not exist — run base schema (users / 001) before this migration`);
  }
  if (await indexExists(conn, schema, table, indexName)) {
    console.log(`SKIP index (exists): ${indexName} ON ${table}`);
    return;
  }
  const sql = `CREATE INDEX \`${indexName}\` ON \`${table}\` (${columnsExpr})`;
  await conn.query(sql);
  console.log(`OK: CREATE INDEX ${indexName} ON ${table} (${columnsExpr})`);
}

/**
 * Parse: `email` VARCHAR(255) NULL AFTER `username`
 */
function parseColumnDefinition(part) {
  const trimmed = part.trim().replace(/^,\s*/, '');
  const match = trimmed.match(
    /^`?(\w+)`?\s+(.+?)(?:\s+AFTER\s+`?(\w+)`?)?$/is
  );
  if (!match) return null;
  return {
    name: match[1],
    definition: match[2].trim(),
    after: match[3] || null,
    raw: trimmed,
  };
}

async function ensureColumn(conn, schema, table, columnPart) {
  const col = parseColumnDefinition(columnPart);
  if (!col) {
    throw new Error(`Could not parse column definition: ${columnPart.slice(0, 80)}`);
  }
  if (!(await tableExists(conn, schema, table))) {
    throw new Error(`Table \`${table}\` does not exist — run base schema before this migration`);
  }
  if (await columnExists(conn, schema, table, col.name)) {
    console.log(`SKIP column (exists): ${table}.${col.name}`);
    return;
  }
  let sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.definition}`;
  if (col.after) {
    sql += ` AFTER \`${col.after}\``;
  }
  await conn.query(sql);
  console.log(`OK: ADD COLUMN ${table}.${col.name}`);
}

async function runAlterAddColumns(conn, schema, stmt) {
  const match = stmt.match(ALTER_ADD_COLUMNS_RE);
  if (!match) return false;

  const table = match[1];
  const body = match[2].trim();
  const parts = body.split(/,\s*ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi);
  for (const part of parts) {
    const segment = part.replace(/^ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi, '').trim();
    if (segment) await ensureColumn(conn, schema, table, segment);
  }
  return true;
}

async function runStatement(conn, schema, stmt) {
  const trimmed = stmt.trim();
  if (!trimmed) return;

  const indexMatch = trimmed.match(CREATE_INDEX_RE);
  if (indexMatch) {
    await ensureIndex(conn, schema, indexMatch[1], indexMatch[2], indexMatch[3].trim());
    return;
  }

  if (await runAlterAddColumns(conn, schema, trimmed)) {
    return;
  }

  try {
    await conn.query(trimmed);
    console.log('OK:', trimmed.slice(0, 70).replace(/\s+/g, ' '));
  } catch (err) {
    if (SKIP_CODES.has(err.code)) {
      console.warn('SKIP (exists):', err.message);
      return;
    }
    throw err;
  }
}

function stripLeadingComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n')
    .trim();
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => stripLeadingComments(s))
    .filter((s) => s.length > 0);
}

async function runMigrationFile(conn, filePath, label) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const schema = await getSchemaName(conn);
  if (!schema) {
    throw new Error('No database selected. Set DB_NAME in .env.');
  }

  console.log(`\n--- ${label} (schema: ${schema}) ---`);
  const statements = splitStatements(sql);
  let ok = 0;
  let skipped = 0;

  for (const stmt of statements) {
    try {
      const before = skipped;
      await runStatement(conn, schema, stmt);
      ok += 1;
    } catch (err) {
      if (SKIP_CODES.has(err.code)) {
        console.warn('SKIP (exists):', err.message);
        skipped += 1;
      } else {
        console.error('FAIL:', stmt.slice(0, 100).replace(/\s+/g, ' '));
        throw err;
      }
    }
  }

  console.log(`\n${label} finished: ${ok} statements applied, ${skipped} skipped.`);
  return { ok, skipped, total: statements.length };
}

module.exports = {
  runMigrationFile,
  splitStatements,
  stripLeadingComments,
  ensureIndex,
  ensureColumn,
  indexExists,
  columnExists,
  tableExists,
};
