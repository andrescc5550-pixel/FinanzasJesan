// database.js — Base de datos en archivo JSON (sin instalación extra)
const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'finanzas_data.json');

const DEFAULT_DATA = {
  transactions: [],
  categories: {
    ingreso: ['Ventas', 'Servicios', 'Inversiones', 'Préstamos', 'Otros ingresos'],
    egreso: ['Nómina', 'Alquiler', 'Servicios públicos', 'Marketing', 'Compras / Inventario', 'Transporte', 'Impuestos', 'Mantenimiento', 'Otros gastos']
  },
  config: { company: 'Mi Empresa', nit: '', currency: 'Q', address: '', phone: '', alertLimit: 0, savingsGoal: 20 },
  nextId: 1
};

function load() {
  if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2)); }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

module.exports = { load, save };
