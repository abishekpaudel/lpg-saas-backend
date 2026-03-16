const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'p@ssw0rd',
  database: process.env.MYSQL_DATABASE || 'gas_queue_system',
  port: parseInt(process.env.MYSQL_PORT) || 3306
}

async function seed() {
  console.log('🌱 Starting database seeder...')
  const conn = await mysql.createConnection(dbConfig)
  await conn.beginTransaction()

  try {

    await conn.execute('DELETE FROM reviews')
    await conn.execute('DELETE FROM payments')
    await conn.execute('DELETE FROM queue')
    await conn.execute('DELETE FROM bookings')
    await conn.execute('DELETE FROM stock')
    await conn.execute('DELETE FROM products')
    await conn.execute('DELETE FROM suppliers')
    await conn.execute('DELETE FROM users')
    console.log('🧹 Cleared existing data')

    const SALT_ROUNDS = 10

    const superAdminId = uuidv4()
    const supplier1UserId = uuidv4()
    const supplier2UserId = uuidv4()

    const customer1Id = uuidv4()
    const customer2Id = uuidv4()
    const customer3Id = uuidv4()
    const customer4Id = uuidv4()
    const customer5Id = uuidv4()

    const adminHash = await bcrypt.hash('Admin@1234', SALT_ROUNDS)
    const supplierHash = await bcrypt.hash('Supplier@1234', SALT_ROUNDS)
    const custHash = await bcrypt.hash('Customer@1234', SALT_ROUNDS)

    await conn.execute(
      `INSERT INTO users (id,name,email,password_hash,phone,role,is_active) VALUES
       (?, 'Super Admin', 'abishekpaudel56@gmail.com', ?, '+977-9862383579', 'SUPER_ADMIN',1)`,
      [superAdminId, adminHash]
    )

    await conn.execute(
      `INSERT INTO users (id,name,email,password_hash,phone,role,is_active) VALUES
       (?, 'Swift Vatti Pasal', 'swift@gasqueue.com', ?, '+977-9811000001','SUPPLIER',1),
       (?, 'Jhapali Thag Samuhik Pasal', 'jhapali@gasqueue.com', ?, '+977-9811000002','SUPPLIER',1)`,
      [supplier1UserId, supplierHash, supplier2UserId, supplierHash]
    )

    await conn.execute(
      `INSERT INTO users (id,name,email,password_hash,phone,role,is_active) VALUES
       (?, 'Abiskar Lamicchane', 'abiskar@example.com', ?, '+977-9841000001','CUSTOMER',1),
       (?, 'Manoj Kafle', 'manoj@example.com', ?, '+977-9841000002','CUSTOMER',1),
       (?, 'Roshan Paudel', 'roshan@example.com', ?, '+977-9841000003','CUSTOMER',1),
       (?, 'Samrat Paudel', 'samrat@example.com', ?, '+977-9841000004','CUSTOMER',1),
       (?, 'Nirvic Regmi', 'nirvic@example.com', ?, '+977-9841000005','CUSTOMER',1)`,
      [
        customer1Id, custHash,
        customer2Id, custHash,
        customer3Id, custHash,
        customer4Id, custHash,
        customer5Id, custHash
      ]
    )

    console.log('👤 Users seeded')

    const supplier1Id = uuidv4()
    const supplier2Id = uuidv4()

    await conn.execute(
      `INSERT INTO suppliers
       (id,user_id,business_name,description,address,city,state,latitude,longitude,phone,email,is_approved,is_open,avg_rating,total_reviews)
       VALUES
       (?, ?, 'Swift Vatti Pasal','Local LPG distributor','Birtamode','Jhapa','Koshi',26.6490,87.9890,'+977-9811000001','swift@gasqueue.com',1,1,4.5,12),
       (?, ?, 'Jhapali Thag Samuhik Pasal','Community LPG supplier','Damak','Jhapa','Koshi',26.6680,87.6990,'+977-9811000002','jhapali@gasqueue.com',1,1,4.2,8)`,
      [supplier1Id, supplier1UserId, supplier2Id, supplier2UserId]
    )

    console.log('🏪 Suppliers seeded')

    const prod1Id = uuidv4()
    const prod2Id = uuidv4()
    const prod3Id = uuidv4()

    await conn.execute(
      `INSERT INTO products (id,name,description,weight_kg,category,is_active) VALUES
       (?, '14.2 kg LPG Cylinder','Standard domestic LPG cylinder',14.2,'LPG',1),
       (?, '5 kg LPG Cylinder','Small portable LPG cylinder',5.0,'LPG',1),
       (?, '19 kg LPG Cylinder','Commercial LPG cylinder',19.0,'LPG',1)`,
      [prod1Id, prod2Id, prod3Id]
    )

    console.log('📦 Products seeded')

    const stock1Id = uuidv4()
    const stock2Id = uuidv4()
    const stock3Id = uuidv4()
    const stock4Id = uuidv4()

    await conn.execute(
      `INSERT INTO stock (id,supplier_id,product_id,quantity_available,quantity_reserved,price_per_unit,last_restocked_at) VALUES
       (?, ?, ?,50,0,1850.00,NOW()),
       (?, ?, ?,20,0,750.00,NOW()),
       (?, ?, ?,60,0,1850.00,NOW()),
       (?, ?, ?,15,0,2800.00,NOW())`,
      [
        stock1Id, supplier1Id, prod1Id,
        stock2Id, supplier1Id, prod2Id,
        stock3Id, supplier2Id, prod1Id,
        stock4Id, supplier2Id, prod3Id
      ]
    )

    console.log('📊 Stock seeded')

    await conn.commit()

    console.log('\n✅ Seeding completed successfully!\n')

    console.log('SUPER ADMIN')
    console.log('Email: abishekpaudel56@gmail.com')
    console.log('Password: Admin@1234\n')

    console.log('SUPPLIER')
    console.log('Email: swift@gasqueue.com')
    console.log('Password: Supplier@1234\n')

    console.log('SUPPLIER')
    console.log('Email: jhapali@gasqueue.com')
    console.log('Password: Supplier@1234\n')

    console.log('CUSTOMERS PASSWORD: Customer@1234')

  } catch (err) {
    await conn.rollback()
    console.error('❌ Seeding failed:', err.message)
    throw err
  } finally {
    await conn.end()
  }
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})