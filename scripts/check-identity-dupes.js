const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

(async () => {
  const c = await mysql.createConnection(getDbConfig());
  const [u] = await c.query(
    `SELECT id, username, email, phone, role FROM users WHERE username IN ('sales_sai','admin_sai','manager_sai')`
  );
  console.log('users', u);
  for (const user of u) {
    const entityRepo = require('../payments/repositories/entityRepository');
    const dupes = await entityRepo.countDuplicateIdentity({
      email: user.email,
      phone: user.phone,
      excludeUserId: user.id,
    });
    console.log(user.username, { email: user.email, phone: user.phone, dupes });
  }
  await c.end();
})();
