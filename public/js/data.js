// data.js — Comunicación con el servidor (API REST)

const API = 'http://localhost:3000/api';

const DB = {

  async getTransactions() {
    const res = await fetch(`${API}/transactions`);
    return res.json();
  },

  async addTransaction(tx) {
    const res = await fetch(`${API}/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx)
    });
    return res.json();
  },

  async deleteTransaction(id) {
    await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
  },

  async getCategories() {
    const res = await fetch(`${API}/categories`);
    return res.json();
  },

  async addCategory(type, name) {
    const res = await fetch(`${API}/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name })
    });
    return res.ok;
  },

  async deleteCategory(type, name) {
    await fetch(`${API}/categories`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name })
    });
  },

  async getConfig() {
    const res = await fetch(`${API}/config`);
    return res.json();
  },

  async saveConfig(cfg) {
    await fetch(`${API}/config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg)
    });
  },

  filterTransactions(list, filters = {}) {
    let result = [...list];
    if (filters.type) result = result.filter(t => t.type === filters.type);
    if (filters.category) result = result.filter(t => t.category === filters.category);
    if (filters.from) result = result.filter(t => t.date >= filters.from);
    if (filters.to) result = result.filter(t => t.date <= filters.to);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(t => t.description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s));
    }
    if (filters.year !== undefined) result = result.filter(t => new Date(t.date + 'T00:00:00').getFullYear() === filters.year);
    if (filters.month !== undefined && filters.month !== '') result = result.filter(t => new Date(t.date + 'T00:00:00').getMonth() === Number(filters.month));
    return result;
  },

  sumByType(list) {
    const income = list.filter(t => t.type === 'ingreso').reduce((s, t) => s + Number(t.amount), 0);
    const expense = list.filter(t => t.type === 'egreso').reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  },

  getMonthlyData(list, year) {
    const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
    list.filter(t => new Date(t.date + 'T00:00:00').getFullYear() === year).forEach(t => {
      const m = new Date(t.date + 'T00:00:00').getMonth();
      if (t.type === 'ingreso') months[m].income += Number(t.amount);
      else months[m].expense += Number(t.amount);
    });
    return months;
  },

  getCategoryBreakdown(list, type) {
    const map = {};
    list.filter(t => t.type === type).forEach(t => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return map;
  }
};
