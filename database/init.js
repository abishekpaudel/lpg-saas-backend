const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'p@ssw0rd',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  multipleStatements: true,
};

async function initDatabase() {
  console.log('🔧 Initializing database...');
  const conn = await mysql.createConnection(config);

  const schemaSQL = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8'
  );

  const statements = schemaSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      if (!err.message.includes('already exists')) {
        console.error(`SQL error: ${err.message}`);
        console.error('Statement:', stmt.substring(0, 100));
      }
    }
  }

  console.log('✅ Database schema created successfully');
  await conn.end();
}

module.exports = { initDatabase };

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
