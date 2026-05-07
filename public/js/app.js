// app.js — Lógica principal de la aplicación
let currentPage = 'dashboard';
let currentType = 'ingreso';
let allTransactions = [];
let allCategories = {};
let config = {};
let pendingDeleteId = null;

// ===== NAVEGACIÓN =====
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  currentPage = page;
  const titles = {
    dashboard: ['Dashboard', 'Resumen financiero general'],
    nueva: ['Nueva Transacción', 'Registra un ingreso o egreso'],
    historial: ['Historial', 'Todas las transacciones'],
    reportes: ['Reportes', 'Análisis y exportación de datos'],
    categorias: ['Categorías', 'Administra las categorías'],
    config: ['Configuración', 'Ajustes del sistema']
  };
  if (titles[page]) {
    document.getElementById('pageTitle').textContent = titles[page][0];
    document.getElementById('pageSub').textContent = titles[page][1];
  }
  if (page === 'dashboard') refreshDashboard();
  if (page === 'historial') renderHistorial();
  if (page === 'reportes') renderReports();
  if (page === 'categorias') renderCategories();
  if (page === 'nueva') refreshFormStats();
  if (page === 'config') loadConfigForm();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== FORMATO =====
function fmt(n) {
  const sym = config.currency || 'Q';
  return `${sym} ${Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ===== DASHBOARD =====
async function refreshDashboard() {
  allTransactions = await DB.getTransactions();
  const now = new Date();
  const thisMonth = allTransactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totals = DB.sumByType(allTransactions);
  const monthly = DB.sumByType(thisMonth);

  document.getElementById('kpi-balance').textContent = fmt(totals.balance);
  document.getElementById('kpi-income').textContent = fmt(monthly.income);
  document.getElementById('kpi-expense').textContent = fmt(monthly.expense);
  document.getElementById('kpi-savings').textContent = fmt(monthly.income - monthly.expense);
  document.getElementById('kpi-income-count').textContent = `${thisMonth.filter(t=>t.type==='ingreso').length} transacciones`;
  document.getElementById('kpi-expense-count').textContent = `${thisMonth.filter(t=>t.type==='egreso').length} transacciones`;
  const savPct = monthly.income > 0 ? ((monthly.income - monthly.expense) / monthly.income * 100).toFixed(1) : 0;
  document.getElementById('kpi-savings-pct').textContent = `${savPct}% del total`;
  const balTrend = totals.balance >= 0 ? '▲ Balance positivo' : '▼ Balance negativo';
  document.getElementById('kpi-balance-trend').textContent = balTrend;
  document.getElementById('kpi-balance-trend').style.color = totals.balance >= 0 ? '#059669' : '#dc2626';

  // Alert check
  if (config.alertLimit && monthly.expense > Number(config.alertLimit)) {
    showToast(`⚠️ Egresos superaron el límite de ${fmt(config.alertLimit)}`, 'error');
  }

  renderRecentTable(allTransactions.slice(0, 8));
  renderDashboardCharts();
}

function renderRecentTable(txs) {
  const tbody = document.getElementById('recentTableBody');
  if (!txs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><i class="fas fa-inbox"></i><br>No hay transacciones aún</td></tr>';
    return;
  }
  tbody.innerHTML = txs.map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td>${t.description}</td>
      <td><span style="font-size:12px;color:#64748b">${t.category}</span></td>
      <td><span class="badge ${t.type === 'ingreso' ? 'badge-income' : 'badge-expense'}">${t.type === 'ingreso' ? 'Ingreso' : 'Egreso'}</span></td>
      <td class="text-right ${t.type === 'ingreso' ? 'amount-income' : 'amount-expense'}">${t.type === 'ingreso' ? '+' : '−'}${fmt(t.amount)}</td>
    </tr>`).join('');
}

// ===== NUEVA TRANSACCIÓN =====
function setType(type) {
  currentType = type;
  document.getElementById('btnIngreso').classList.toggle('active', type === 'ingreso');
  document.getElementById('btnEgreso').classList.toggle('active', type === 'egreso');
  loadCategorySelect();
}

async function loadCategorySelect() {
  allCategories = await DB.getCategories();
  const sel = document.getElementById('f-cat');
  const cats = allCategories[currentType] || [];
  sel.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
}

async function refreshFormStats() {
  allTransactions = await DB.getTransactions();
  const now = new Date();
  const todayStr = today();
  const weekAgo = new Date(now - 7 * 864e5).toISOString().split('T')[0];
  document.getElementById('stat-today').textContent = allTransactions.filter(t => t.date === todayStr).length;
  document.getElementById('stat-week').textContent = allTransactions.filter(t => t.date >= weekAgo).length;
  document.getElementById('stat-month').textContent = allTransactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  await loadCategorySelect();
  if (!document.getElementById('f-date').value) document.getElementById('f-date').value = todayStr;
}

async function saveTransaction() {
  const amount = parseFloat(document.getElementById('f-amount').value);
  const desc = document.getElementById('f-desc').value.trim();
  const cat = document.getElementById('f-cat').value;
  const date = document.getElementById('f-date').value;
  if (!amount || amount <= 0) return showToast('Ingresa un monto válido', 'error');
  if (!desc) return showToast('Escribe una descripción', 'error');
  if (!date) return showToast('Selecciona una fecha', 'error');
  const tx = {
    type: currentType, amount, description: desc, category: cat,
    date, method: document.getElementById('f-method').value,
    notes: document.getElementById('f-notes').value.trim()
  };
  await DB.addTransaction(tx);
  showToast(`✓ ${currentType === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`, 'success');
  clearForm();
  refreshFormStats();
}

function clearForm() {
  document.getElementById('f-amount').value = '';
  document.getElementById('f-desc').value = '';
  document.getElementById('f-notes').value = '';
  document.getElementById('f-date').value = today();
}

// ===== HISTORIAL =====
async function renderHistorial() {
  allTransactions = await DB.getTransactions();
  allCategories = await DB.getCategories();

  // Populate filter categories
  const filterCat = document.getElementById('filter-cat');
  const allCats = [...(allCategories.ingreso || []), ...(allCategories.egreso || [])];
  const currentVal = filterCat.value;
  filterCat.innerHTML = '<option value="">Todas las categorías</option>' + [...new Set(allCats)].map(c => `<option ${c===currentVal?'selected':''}>${c}</option>`).join('');

  const filters = {
    search: document.getElementById('search').value,
    type: document.getElementById('filter-type').value,
    category: document.getElementById('filter-cat').value,
    from: document.getElementById('filter-from').value,
    to: document.getElementById('filter-to').value
  };
  const filtered = DB.filterTransactions(allTransactions, filters);
  const totals = DB.sumByType(filtered);

  document.getElementById('hist-count').textContent = `${filtered.length} transacción${filtered.length !== 1 ? 'es' : ''}`;
  document.getElementById('hist-income').textContent = fmt(totals.income);
  document.getElementById('hist-expense').textContent = fmt(totals.expense);
  document.getElementById('hist-balance').textContent = `Balance: ${fmt(totals.balance)}`;

  const tbody = document.getElementById('historialBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-inbox"></i><br>No se encontraron transacciones</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td>${fmtDate(t.date)}</td>
      <td>${t.description}${t.notes ? `<br><small style="color:#94a3b8">${t.notes}</small>` : ''}</td>
      <td>${t.category}</td>
      <td>${t.method || '—'}</td>
      <td><span class="badge ${t.type==='ingreso'?'badge-income':'badge-expense'}">${t.type==='ingreso'?'Ingreso':'Egreso'}</span></td>
      <td class="text-right ${t.type==='ingreso'?'amount-income':'amount-expense'}">${t.type==='ingreso'?'+':'−'}${fmt(t.amount)}</td>
      <td class="text-center">
        <button class="action-btn delete" onclick="confirmDelete('${t.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function clearFilters() {
  ['search','filter-type','filter-cat','filter-from','filter-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderHistorial();
}

// ===== REPORTES =====
async function renderReports() {
  allTransactions = await DB.getTransactions();
  const yearSel = document.getElementById('report-year');
  const year = parseInt(yearSel.value) || new Date().getFullYear();
  const month = document.getElementById('report-month').value;

  const filtered = DB.filterTransactions(allTransactions, { year, month: month !== '' ? month : undefined });
  const totals = DB.sumByType(filtered);
  const margin = totals.income > 0 ? ((totals.income - totals.expense) / totals.income * 100).toFixed(1) : 0;

  document.getElementById('r-income').textContent = fmt(totals.income);
  document.getElementById('r-expense').textContent = fmt(totals.expense);
  document.getElementById('r-net').textContent = fmt(totals.balance);
  document.getElementById('r-net').style.color = totals.balance >= 0 ? '#059669' : '#dc2626';
  document.getElementById('r-margin').textContent = `${margin}%`;

  const monthlyData = DB.getMonthlyData(allTransactions, year);
  renderReportCharts(year, month, monthlyData, filtered);
}

function renderReportCharts(year, month, monthlyData, filtered) {
  // Monthly table
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const tbody = document.getElementById('monthlyBody');
  if (tbody) {
    tbody.innerHTML = monthlyData.map((m, i) => {
      const bal = m.income - m.expense;
      return `<tr>
        <td>${months[i]}</td>
        <td class="text-right amount-income">${fmt(m.income)}</td>
        <td class="text-right amount-expense">${fmt(m.expense)}</td>
        <td class="text-right ${bal>=0?'amount-income':'amount-expense'}">${fmt(bal)}</td>
      </tr>`;
    }).join('');
  }

  // Charts
  const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  reportFlowInst = destroyChart(reportFlowInst);
  reportFlowInst = renderFlowChart('reportFlowChart', monthlyData, labels);

  const catData = DB.getCategoryBreakdown(filtered, 'egreso');
  reportPieInst = destroyChart(reportPieInst);
  if (Object.keys(catData).length > 0) reportPieInst = renderDonutChart('reportPieChart', catData, null);
}

// ===== CATEGORÍAS =====
async function renderCategories() {
  allCategories = await DB.getCategories();
  ['ingreso', 'egreso'].forEach(type => {
    const list = document.getElementById(`cat-${type === 'ingreso' ? 'income' : 'expense'}-list`);
    const cats = allCategories[type] || [];
    list.innerHTML = cats.length ? cats.map(c => `
      <li class="cat-item">
        <span>${c}</span>
        <button class="action-btn delete" onclick="removeCategory('${type}','${c}')"><i class="fas fa-times"></i></button>
      </li>`).join('') : '<li style="padding:12px 20px;color:#94a3b8;font-size:13px">Sin categorías</li>';
  });
}

async function addCategory(type) {
  const inputId = type === 'ingreso' ? 'new-income-cat' : 'new-expense-cat';
  const val = document.getElementById(inputId).value.trim();
  if (!val) return showToast('Escribe el nombre de la categoría', 'error');
  const ok = await DB.addCategory(type, val);
  if (ok) { document.getElementById(inputId).value = ''; showToast('✓ Categoría agregada', 'success'); renderCategories(); }
  else showToast('Esa categoría ya existe', 'error');
}

async function removeCategory(type, name) {
  await DB.deleteCategory(type, name);
  showToast('Categoría eliminada', 'success');
  renderCategories();
}

// ===== CONFIGURACIÓN =====
async function loadConfigForm() {
  config = await DB.getConfig();
  document.getElementById('cfg-company').value = config.company || '';
  document.getElementById('cfg-nit').value = config.nit || '';
  document.getElementById('cfg-currency').value = config.currency || 'Q';
  document.getElementById('cfg-address').value = config.address || '';
  document.getElementById('cfg-phone').value = config.phone || '';
  document.getElementById('cfg-alert').value = config.alertLimit || '';
  document.getElementById('cfg-savings-goal').value = config.savingsGoal || '';
}

async function saveConfig() {
  const cfg = {
    company: document.getElementById('cfg-company').value.trim(),
    nit: document.getElementById('cfg-nit').value.trim(),
    currency: document.getElementById('cfg-currency').value,
    address: document.getElementById('cfg-address').value.trim(),
    phone: document.getElementById('cfg-phone').value.trim(),
    alertLimit: parseFloat(document.getElementById('cfg-alert').value) || 0,
    savingsGoal: parseFloat(document.getElementById('cfg-savings-goal').value) || 20
  };
  await DB.saveConfig(cfg);
  config = cfg;
  document.getElementById('company-name-sidebar').textContent = cfg.company || 'Mi Empresa';
  document.getElementById('avatar-letter').textContent = (cfg.company || 'E')[0].toUpperCase();
  document.getElementById('currency-sym').textContent = cfg.currency;
  showToast('✓ Configuración guardada', 'success');
}

async function resetData() {
  if (!confirm('¿Estás seguro? Esto eliminará TODOS los datos del sistema.')) return;
  await fetch('http://localhost:3000/api/reset', { method: 'POST' });
  showToast('Todos los datos han sido eliminados', 'error');
  navigateTo('dashboard');
}

// ===== ELIMINAR =====
function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('deleteModal').classList.add('hidden');
  pendingDeleteId = null;
}
document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  await DB.deleteTransaction(pendingDeleteId);
  closeModal();
  showToast('Transacción eliminada', 'success');
  renderHistorial();
});

// ===== EXPORTAR PDF =====
async function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const cfg = await DB.getConfig();
  const year = parseInt(document.getElementById('report-year')?.value) || new Date().getFullYear();
  const month = document.getElementById('report-month')?.value;
  const txs = DB.filterTransactions(allTransactions, { year, month: month !== '' ? month : undefined });
  const totals = DB.sumByType(txs);
  const sym = cfg.currency || 'Q';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229);
  doc.text('FinanzasPro', 14, 20);
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reporte Financiero — ${cfg.company || 'Mi Empresa'}`, 14, 28);
  doc.setFontSize(10);
  doc.text(`Generado el ${new Date().toLocaleDateString('es-GT')}`, 14, 35);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 40, 196, 40);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
  doc.text('Resumen', 14, 50);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text(`Total Ingresos:`, 14, 60); doc.setTextColor(5, 150, 105); doc.text(`${sym} ${totals.income.toFixed(2)}`, 80, 60);
  doc.setTextColor(100, 116, 139); doc.text(`Total Egresos:`, 14, 68); doc.setTextColor(220, 38, 38); doc.text(`${sym} ${totals.expense.toFixed(2)}`, 80, 68);
  doc.setTextColor(100, 116, 139); doc.text(`Balance Neto:`, 14, 76);
  doc.setTextColor(totals.balance >= 0 ? 5 : 220, totals.balance >= 0 ? 150 : 38, totals.balance >= 0 ? 105 : 38);
  doc.text(`${sym} ${totals.balance.toFixed(2)}`, 80, 76);

  if (txs.length > 0) {
    doc.autoTable({
      startY: 90,
      head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
      body: txs.map(t => [fmtDate(t.date), t.description, t.category, t.type === 'ingreso' ? 'Ingreso' : 'Egreso', `${t.type==='ingreso'?'+':'−'}${sym} ${Number(t.amount).toFixed(2)}`]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 4 }
    });
  }
  doc.save(`Reporte_${cfg.company || 'Finanzas'}_${year}.pdf`);
  showToast('✓ PDF exportado correctamente', 'success');
}

// ===== EXPORTAR CSV =====
function exportCSV() {
  const rows = [['Fecha','Descripción','Categoría','Método','Tipo','Monto','Notas']];
  allTransactions.forEach(t => rows.push([t.date, t.description, t.category, t.method||'', t.type, t.amount, t.notes||'']));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `transacciones_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  showToast('✓ CSV exportado correctamente', 'success');
}

// ===== TOAST =====
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast show ${type}`;
  setTimeout(() => { t.className = 'toast'; }, 3500);
}

// ===== INIT =====
async function init() {
  const now = new Date();
  document.getElementById('currentDate').textContent = now.toLocaleDateString('es-GT', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Report year selector
  const yearSel = document.getElementById('report-year');
  if (yearSel) {
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
      yearSel.innerHTML += `<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`;
    }
  }

  config = await DB.getConfig();
  if (config.company) {
    document.getElementById('company-name-sidebar').textContent = config.company;
    document.getElementById('avatar-letter').textContent = config.company[0].toUpperCase();
  }
  if (document.getElementById('currency-sym')) {
    document.getElementById('currency-sym').textContent = config.currency || 'Q';
  }

  await refreshDashboard();
  await loadCategorySelect();
  document.getElementById('f-date').value = today();
}

init();
