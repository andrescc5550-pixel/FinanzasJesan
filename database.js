// database.js — Conexión a MySQL
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || 'mysql.railway.internal',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE || 'railway',
  waitForConnections: true,
  connectionLimit: 10
});

async function initDB() {
  const conn = await pool.getConnection();
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(10) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      method VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(10) NOT NULL,
      name VARCHAR(100) NOT NULL,
      UNIQUE KEY unique_cat (type, name)
    )
  `);
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS config (
      cfg_key VARCHAR(50) PRIMARY KEY,
      cfg_value TEXT
    )
  `);

  const [rows] = await conn.execute('SELECT COUNT(*) as c FROM categories');
  if (rows[0].c === 0) {
    const defaults = {
      ingreso: ['Ventas', 'Servicios', 'Inversiones', 'Préstamos', 'Otros ingresos'],
      egreso: ['Nómina', 'Alquiler', 'Servicios públicos', 'Marketing', 'Compras / Inventario', 'Transporte', 'Impuestos', 'Mantenimiento', 'Otros gastos']
    };
    for (const [type, cats] of Object.entries(defaults)) {
      for (const name of cats) {
        await conn.execute('INSERT IGNORE INTO categories (type, name) VALUES (?, ?)', [type, name]);
      }
    }
  }
  conn.release();
  console.log('✅ Base de datos MySQL conectada correctamente');
}

module.exports = { pool, initDB };