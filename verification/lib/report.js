const fs = require('fs');
const path = require('path');
const { RESULTS_DIR, ROOT } = require('./config');

function ensureResultsDir() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function writeJson(name, data) {
  ensureResultsDir();
  const p = path.join(RESULTS_DIR, `${name}.json`);
  fs.writeFileSync(p, JSON.stringify({ generatedAt: new Date().toISOString(), ...data }, null, 2));
  return p;
}

function writeMarkdown(filename, lines) {
  const p = path.join(ROOT, filename);
  const body = Array.isArray(lines) ? lines.join('\n') : lines;
  fs.writeFileSync(p, body.endsWith('\n') ? body : `${body}\n`);
  return p;
}

function statusIcon(pass) {
  return pass ? '✅ PASS' : '❌ FAIL';
}

function pct(pass, total) {
  if (!total) return '0%';
  return `${Math.round((pass / total) * 100)}%`;
}

function table(headers, rows) {
  const sep = `| ${headers.join(' | ')} |`;
  const div = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
  return [sep, div, body].join('\n');
}

module.exports = { writeJson, writeMarkdown, statusIcon, pct, table, ensureResultsDir };
