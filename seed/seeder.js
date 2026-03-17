const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'p@ssw0rd',
  database: process.env.MYSQL_DATABASE || 'gas_queue_system',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
};

async function seed() {
  console.log('🌱 Seeding database...');
  const conn = await mysql.createConnection(dbConfig);
  await conn.beginTransaction();
  try {
    await conn.execute('DELETE FROM reviews');
    await conn.execute('DELETE FROM payments');
    await conn.execute('DELETE FROM queue');
    await conn.execute('DELETE FROM bookings');
    await conn.execute('DELETE FROM stock');
    await conn.execute('DELETE FROM products');
    await conn.execute('DELETE FROM suppliers');
    await conn.execute('DELETE FROM blog_posts');
    await conn.execute('DELETE FROM users');

    const SALT = 10;
    const passHash = await bcrypt.hash('Test@123', SALT);

    const adminId = uuidv4();
    const sup1UserId = uuidv4(); 
    const sup2UserId = uuidv4();
    const cust1Id = uuidv4(); 
    const cust2Id = uuidv4(); 
    const cust3Id = uuidv4();
    const cust4Id = uuidv4(); 
    const cust5Id = uuidv4();

    await conn.execute(
      'INSERT INTO users (id,name,email,password_hash,phone,role) VALUES (?,?,?,?,?,?)',
      [adminId,'Super Admin','abishekpaudel56@gmail.com',passHash,'+977-9800000001','SUPER_ADMIN']
    );

    await conn.execute(
      'INSERT INTO users (id,name,email,password_hash,phone,role) VALUES (?,?,?,?,?,?),(?,?,?,?,?,?)',
      [
        sup1UserId,'Swift bhatti pasal','swift@gasqueue.com',passHash,'+977-9811000001','SUPPLIER',
        sup2UserId,'Jhapali Thag Samuha Bebasaye','jhapali@gasqueue.com',passHash,'+977-9811000002','SUPPLIER'
      ]
    );

    await conn.execute(
      'INSERT INTO users (id,name,email,password_hash,phone,role) VALUES (?,?,?,?,?,?),(?,?,?,?,?,?),(?,?,?,?,?,?),(?,?,?,?,?,?),(?,?,?,?,?,?)',
      [
        cust1Id,'Abishek Paudel','abishek@example.com',passHash,'+977-9841000001','CUSTOMER',
        cust2Id,'Abiskar Lamichane','abiskar@example.com',passHash,'+977-9841000002','CUSTOMER',
        cust3Id,'Nirvic Regmi','nirvic@example.com',passHash,'+977-9841000003','CUSTOMER',
        cust4Id,'Samrat Paudel','samrat@example.com',passHash,'+977-9841000004','CUSTOMER',
        cust5Id,'Roshan Paudel','roshan@example.com',passHash,'+977-9841000005','CUSTOMER'
      ]
    );

    const sup1Id = uuidv4(); 
    const sup2Id = uuidv4();

    await conn.execute(
      `INSERT INTO suppliers (id,user_id,business_name,description,address,city,state,latitude,longitude,phone,email,is_approved,is_open,avg_rating,total_reviews)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,1,1,4.5,10),(?,?,?,?,?,?,?,?,?,?,?,1,1,4.2,8)`,
      [
        sup1Id,sup1UserId,'Swift bhatti pasal','Local LPG supplier','Kathmandu','Kathmandu','Bagmati',27.7172,85.3240,'+977-9811000001','swift@gasqueue.com',
        sup2Id,sup2UserId,'Jhapali Thag Samuha Bebasaye','Trusted LPG supplier','Lalitpur','Lalitpur','Bagmati',27.6644,85.3188,'+977-9811000002','jhapali@gasqueue.com'
      ]
    );

    const prod1Id = uuidv4(); 
    const prod2Id = uuidv4(); 
    const prod3Id = uuidv4();

    await conn.execute(
      'INSERT INTO products (id,name,description,weight_kg,category) VALUES (?,?,?,?,?),(?,?,?,?,?),(?,?,?,?,?)',
      [
        prod1Id,'14.2 kg LPG Cylinder','Standard domestic LPG cylinder',14.2,'LPG',
        prod2Id,'5 kg LPG Cylinder','Small portable LPG cylinder',5.0,'LPG',
        prod3Id,'19 kg LPG Cylinder','Commercial LPG cylinder',19.0,'LPG'
      ]
    );

    const s1Id = uuidv4(); 
    const s2Id = uuidv4(); 
    const s3Id = uuidv4(); 
    const s4Id = uuidv4();

    await conn.execute(
      'INSERT INTO stock (id,supplier_id,product_id,quantity_available,price_per_unit,last_restocked_at) VALUES (?,?,?,?,?,NOW()),(?,?,?,?,?,NOW()),(?,?,?,?,?,NOW()),(?,?,?,?,?,NOW())',
      [
        s1Id,sup1Id,prod1Id,50,1850,
        s2Id,sup1Id,prod2Id,20,750,
        s3Id,sup2Id,prod1Id,60,1850,
        s4Id,sup2Id,prod3Id,15,2800
      ]
    );

    await conn.commit();

    console.log('\n✅ Seeding complete!');
    console.log('─────────────────────────────');
    console.log('SUPER ADMIN  → abishekpaudel56@gmail.com / Test@123');
    console.log('SUPPLIER 1   → swift@gasqueue.com        / Test@123');
    console.log('SUPPLIER 2   → jhapali@gasqueue.com      / Test@123');
    console.log('CUSTOMERS    → All passwords: Test@123');
    console.log('─────────────────────────────\n');

  } catch (err) {
    await conn.rollback();
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

seed().catch(() => process.exit(1));