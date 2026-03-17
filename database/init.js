const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'p@ssw0rd',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  multipleStatements: true,
}

async function initDatabase() {
  const conn = await mysql.createConnection(config)

  const schemaSQL = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8'
  )

  const statements = schemaSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    try {
      await conn.query(stmt)
    } catch (err) {}
  }

  // seed admin
  await conn.query(`
    INSERT INTO users (email, password, role)
    VALUES (
      'abishekpaudel56@gmail.com',
      'A@#stevensmith@#49312763',
      'admin'
    )
    ON DUPLICATE KEY UPDATE email=email;
  `)

  // seed suppliers / shops
  await conn.query(`
    INSERT INTO suppliers (name)
    VALUES 
      ('Jhapali Gas Pasal'),
      ('Swift Bhatti Pasal')
    ON DUPLICATE KEY UPDATE name=name;
  `)

  await conn.end()
}

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}