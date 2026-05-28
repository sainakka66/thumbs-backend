const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    const config = getDbConfig();
    if (!config) {
      throw new Error('Database not configured');
    }
    pool = mysql.createPool(config);
  }
  return pool;
}

function setPool(existingPool) {
  pool = existingPool;
}

module.exports = { getPool, setPool };
