// server.js — Servidor Express con MySQL
const express = require('express');
const cors = require('cors');
const path = require('path');
const { pool, initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// TRANSACCIONES
app.get('/api/transactions', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
  res.json(rows);
});

app.post('/api/transactions', async (req, res) => {
  const { type, amount, description, category, date, method, notes } = req.body;
  const [result] = await pool.execute(
    'INSERT INTO transactions (type, amount, description, category, date, method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [type, amount, description, category, date, method || '', notes || '']
  );
  const [rows] = await pool.execute('SELECT * FROM transactions WHERE id = ?', [result.insertId]);
  res.json(rows[0]);
});

app.delete('/api/transactions/:id', async (req, res) => {
  await pool.execute('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// CATEGORÍAS
app.get('/api/categories', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM categories ORDER BY type, name');
  const result = { ingreso: [], egreso: [] };
  rows.forEach(r => result[r.type]?.push(r.name));
  res.json(result);
});

app.post('/api/categories', async (req, res) => {
  const { type, name } = req.body;
  try {
    await pool.execute('INSERT INTO categories (type, name) VALUES (?, ?)', [type, name]);
    res.json({ ok: true });
  } catch {
    res.status(409).json({ ok: false, error: 'Ya existe' });
  }
});

app.delete('/api/categories', async (req, res) => {
  const { type, name } = req.body;
  await pool.execute('DELETE FROM categories WHERE type = ? AND name = ?', [type, name]);
  res.json({ ok: true });
});

// CONFIGURACIÓN
app.get('/api/config', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM config');
  const cfg = {};
  rows.forEach(r => {
    try { cfg[r.cfg_key] = JSON.parse(r.cfg_value); } catch { cfg[r.cfg_key] = r.cfg_value; }
  });
  res.json(cfg);
});

app.post('/api/config', async (req, res) => {
  for (const [key, val] of Object.entries(req.body)) {
    await pool.execute(
      'INSERT INTO config (cfg_key, cfg_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE cfg_value = ?',
      [key, JSON.stringify(val), JSON.stringify(val)]
    );
  }
  res.json({ ok: true });
});

// RESET
app.post('/api/reset', async (req, res) => {
  await pool.execute('DELETE FROM transactions');
  await pool.execute('DELETE FROM config');
  res.json({ ok: true });
});

// Iniciar servidor
initDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ✅ FinanzasPro está corriendo correctamente');
    console.log(`  🌐 Puerto: ${PORT}`);
    console.log('');
  });
}).catch(err => {
  console.error('Error conectando a MySQL:', err);
  process.exit(1);
});