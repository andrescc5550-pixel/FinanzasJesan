const express = require('express');
const cors = require('cors');
const path = require('path');
const { load, save } = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// TRANSACCIONES
app.get('/api/transactions', (req, res) => {
  const data = load();
  res.json(data.transactions.sort((a, b) => b.date.localeCompare(a.date)));
});

app.post('/api/transactions', (req, res) => {
  const data = load();
  const tx = { ...req.body, id: String(data.nextId++), createdAt: new Date().toISOString() };
  data.transactions.unshift(tx);
  save(data);
  res.json(tx);
});

app.delete('/api/transactions/:id', (req, res) => {
  const data = load();
  data.transactions = data.transactions.filter(t => t.id !== req.params.id);
  save(data);
  res.json({ ok: true });
});

// CATEGORÍAS
app.get('/api/categories', (req, res) => res.json(load().categories));

app.post('/api/categories', (req, res) => {
  const { type, name } = req.body;
  const data = load();
  if (data.categories[type].includes(name)) return res.status(409).json({ ok: false });
  data.categories[type].push(name);
  save(data);
  res.json({ ok: true });
});

app.delete('/api/categories', (req, res) => {
  const { type, name } = req.body;
  const data = load();
  data.categories[type] = data.categories[type].filter(c => c !== name);
  save(data);
  res.json({ ok: true });
});

// CONFIGURACIÓN
app.get('/api/config', (req, res) => res.json(load().config));

app.post('/api/config', (req, res) => {
  const data = load();
  data.config = { ...data.config, ...req.body };
  save(data);
  res.json({ ok: true });
});

// RESET
app.post('/api/reset', (req, res) => {
  const data = load();
  data.transactions = [];
  data.config = { company: data.config.company || 'Mi Empresa', nit: '', currency: 'Q', address: '', phone: '', alertLimit: 0, savingsGoal: 20 };
  save(data);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ✅ FinanzasPro está corriendo correctamente');
  console.log(`  🌐 Abre tu navegador en: http://localhost:${PORT}`);
  console.log('  ⚠️  No cierres esta ventana mientras usas el sistema.');
  console.log('');
  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;
  const cmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
  exec(cmd);
});
