// charts.js — Gestión de gráficos con Chart.js
const CHART_COLORS = {
  income: '#4f46e5',
  expense: '#f43f5e',
  palette: ['#4f46e5','#10b981','#f59e0b','#f43f5e','#06b6d4','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1']
};

let flowChartInst = null;
let categoryChartInst = null;
let reportFlowInst = null;
let reportPieInst = null;

function destroyChart(inst) { if (inst) { try { inst.destroy(); } catch(e) {} } return null; }

function formatCurrency(n) {
  const cfg = DB.getConfig();
  return cfg.currency + ' ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function renderFlowChart(canvasId, monthlyData, labels) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Ingresos', data: monthlyData.map(m => m.income), backgroundColor: CHART_COLORS.income + 'cc', borderRadius: 6, borderSkipped: false },
        { label: 'Egresos', data: monthlyData.map(m => m.expense), backgroundColor: CHART_COLORS.expense + 'cc', borderRadius: 6, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatCurrency(ctx.parsed.y) } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8' } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8', callback: v => formatCurrency(v) } }
      }
    }
  });
}

function renderDonutChart(canvasId, data, legendId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  const labels = Object.keys(data);
  const values = Object.values(data);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = labels.map((_, i) => CHART_COLORS.palette[i % CHART_COLORS.palette.length]);

  // Legend
  if (legendId) {
    const leg = document.getElementById(legendId);
    if (leg) {
      leg.innerHTML = labels.map((l, i) => `
        <div class="donut-item">
          <span class="donut-dot" style="background:${colors[i]}"></span>
          <span>${l}</span>
          <span class="donut-pct">${total > 0 ? ((values[i]/total)*100).toFixed(1) : 0}%</span>
        </div>
      `).join('');
    }
  }

  if (labels.length === 0) return null;

  return new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } }
      }
    }
  });
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getLast6Months() {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: d.getMonth(), year: d.getFullYear(), label: MONTH_NAMES[d.getMonth()] });
  }
  return result;
}

function renderDashboardCharts() {
  const months = getLast6Months();
  const allTx = DB.getTransactions();
  const monthlyData = months.map(m => {
    const txs = allTx.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    });
    const inc = txs.filter(t => t.type === 'ingreso').reduce((s,t) => s+t.amount, 0);
    const exp = txs.filter(t => t.type === 'egreso').reduce((s,t) => s+t.amount, 0);
    return { income: inc, expense: exp };
  });

  flowChartInst = destroyChart(flowChartInst);
  flowChartInst = renderFlowChart('flowChart', monthlyData, months.map(m => m.label));

  // Category donut — all time
  const catData = DB.getCategoryBreakdown(allTx, 'egreso');
  categoryChartInst = destroyChart(categoryChartInst);
  if (Object.keys(catData).length > 0) {
    categoryChartInst = renderDonutChart('categoryChart', catData, 'categoryLegend');
  } else {
    const leg = document.getElementById('categoryLegend');
    if (leg) leg.innerHTML = '<p style="font-size:12px;color:#94a3b8;text-align:center;padding:8px">Sin datos aún</p>';
  }
}

function renderReportCharts(year, month) {
  const monthlyData = DB.getMonthlyData(year);
  reportFlowInst = destroyChart(reportFlowInst);
  reportFlowInst = renderFlowChart('reportFlowChart', monthlyData, MONTH_NAMES);

  // Pie for selected period
  let txs = DB.filterTransactions({ year, month: month !== '' ? month : undefined });
  const catData = DB.getCategoryBreakdown(txs, 'egreso');
  reportPieInst = destroyChart(reportPieInst);
  if (Object.keys(catData).length > 0) {
    reportPieInst = renderDonutChart('reportPieChart', catData, null);
  }

  // Monthly table
  const tbody = document.getElementById('monthlyBody');
  if (tbody) {
    tbody.innerHTML = monthlyData.map((m, i) => {
      const bal = m.income - m.expense;
      const balClass = bal >= 0 ? 'amount-income' : 'amount-expense';
      return `<tr>
        <td>${MONTH_FULL[i]}</td>
        <td class="text-right amount-income">${formatCurrency(m.income)}</td>
        <td class="text-right amount-expense">${formatCurrency(m.expense)}</td>
        <td class="text-right ${balClass}">${formatCurrency(bal)}</td>
      </tr>`;
    }).join('');
  }
}
