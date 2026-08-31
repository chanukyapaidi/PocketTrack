/* ==============================================
   PocketTrack — script.js
   ============================================== */
'use strict';

/* ---- LocalStorage Keys ---- */
const LS_EXP = 'pt_expenses';
const LS_BUDGET = 'pt_budget';
const LS_THEME = 'pt_theme';

/* ---- Category Config ---- */
const CATS = {
  Food: { icon: '🍔', color: '#E62429', cls: 'bg-food' },
  Transport: { icon: '🚌', color: '#1565C0', cls: 'bg-transport' },
  Rent: { icon: '🏠', color: '#9B111E', cls: 'bg-rent' },
  Groceries: { icon: '🛒', color: '#42A5F5', cls: 'bg-groceries' },
  Education: { icon: '📚', color: '#0D47A1', cls: 'bg-education' },
  Shopping: { icon: '🛍️', color: '#E53935', cls: 'bg-shopping' },
  Entertainment: { icon: '🎬', color: '#1976D2', cls: 'bg-entertainment' },
  Bills: { icon: '💡', color: '#6A1B9A', cls: 'bg-bills' },
  Other: { icon: '📦', color: '#546E7A', cls: 'bg-other' },
};

/* ---- Chart instances ---- */
let catChart = null, barChart = null, donutChart = null;

/* ---- Modal callback ---- */
let _modalCb = null;

/* ==============================================
   DATA HELPERS
   ============================================== */
const loadExp = () => { try { return JSON.parse(localStorage.getItem(LS_EXP)) || []; } catch { return []; } };
const saveExp = d => localStorage.setItem(LS_EXP, JSON.stringify(d));
const loadBudget = () => parseFloat(localStorage.getItem(LS_BUDGET)) || 0;
const saveBudget = v => localStorage.setItem(LS_BUDGET, v);
const loadTheme = () => localStorage.getItem(LS_THEME) || 'light';
const saveTheme = t => localStorage.setItem(LS_THEME, t);

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtDt = s => { if (!s) return '—'; const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const today = () => new Date().toISOString().split('T')[0];
const total = ex => ex.reduce((s, e) => s + Number(e.amount), 0);
const byCat = ex => { const m = {}; for (const e of ex) m[e.category] = (m[e.category] || 0) + Number(e.amount); return m; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ==============================================
   SAMPLE DATA — pre-loaded on first visit
   ============================================== */
function seedData() {
  if (loadExp().length) return;
  const d = (n) => { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt.toISOString().split('T')[0]; };
  saveExp([
    { id: uid(), name: 'Zomato dinner', amount: 320, category: 'Food', date: d(0), note: 'Biryani + cold drink' },
    { id: uid(), name: 'Metro card recharge', amount: 200, category: 'Transport', date: d(1), note: '' },
    { id: uid(), name: 'Monthly rent', amount: 4500, category: 'Rent', date: d(2), note: 'August rent' },
    { id: uid(), name: 'Big Basket order', amount: 640, category: 'Groceries', date: d(3), note: 'Weekly grocery run' },
    { id: uid(), name: 'Udemy course', amount: 499, category: 'Education', date: d(4), note: 'Full-stack dev course' },
    { id: uid(), name: 'Flipkart clothes', amount: 1200, category: 'Shopping', date: d(5), note: '2 shirts + 1 jeans' },
    { id: uid(), name: 'Netflix subscription', amount: 199, category: 'Entertainment', date: d(6), note: 'Monthly plan' },
    { id: uid(), name: 'Electricity bill', amount: 850, category: 'Bills', date: d(7), note: '' },
    { id: uid(), name: 'Swiggy breakfast', amount: 180, category: 'Food', date: d(8), note: 'Poha + chai' },
    { id: uid(), name: 'Ola cab', amount: 130, category: 'Transport', date: d(9), note: 'College to market' },
    { id: uid(), name: 'Stationary shop', amount: 250, category: 'Education', date: d(10), note: 'Notebooks + pens' },
    { id: uid(), name: 'Pizza with friends', amount: 560, category: 'Food', date: d(11), note: 'Group order Dominos' },
    { id: uid(), name: 'Wi-Fi bill', amount: 600, category: 'Bills', date: d(12), note: 'Monthly broadband' },
    { id: uid(), name: 'Amazon earphones', amount: 999, category: 'Shopping', date: d(13), note: 'Boult audio' },
    { id: uid(), name: 'Movie tickets', amount: 300, category: 'Entertainment', date: d(14), note: 'INOX 2 tickets' },
  ]);
  saveBudget(15000);
}

/* ==============================================
   TOAST
   ============================================== */
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.className = 'toast', 3200);
}

/* ==============================================
   THEME
   ============================================== */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  saveTheme(t);
  // re-render charts if visible
  renderCharts();
  renderBudget();
}
function toggleTheme() {
  applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

/* ==============================================
   NAVBAR SCROLL SHADOW
   ============================================== */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,.12)' : '';
});

/* ==============================================
   MOBILE MENU
   ============================================== */
function closeMobileMenu() {
  document.getElementById('mobileMenu').classList.remove('open');
}
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
});

/* ==============================================
   DASHBOARD
   ============================================== */
function renderDashboard() {
  const exp = loadExp();
  const budget = loadBudget();
  const spent = total(exp);
  const rem = budget - spent;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  /* Month badge */
  document.getElementById('monthBadge').textContent =
    new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  /* Stat cards */
  document.getElementById('sBudget').textContent = fmt(budget);
  document.getElementById('sSpent').textContent = fmt(spent);
  document.getElementById('sRemaining').textContent = fmt(Math.max(rem, 0));
  document.getElementById('sCount').textContent = exp.length;
  const remPct = budget > 0 ? Math.max(Math.round((rem / budget) * 100), 0) : 100;
  document.getElementById('sRemainingPct').textContent = `${remPct}% left`;

  /* Progress bar */
  const fill = document.getElementById('progressFill');
  const badge = document.getElementById('pctBadge');
  fill.style.width = pct + '%';
  badge.textContent = Math.round(pct) + '%';
  fill.className = 'progress-fill';
  badge.className = 'pct-badge';
  if (pct >= 100) { fill.classList.add('danger'); badge.classList.add('danger'); }
  else if (pct >= 80) { fill.classList.add('warn'); badge.classList.add('warn'); }
  document.getElementById('spentLabel').textContent = `${fmt(spent)} spent`;
  document.getElementById('budgetLabel').textContent = `of ${fmt(budget)}`;

  /* Alert bar */
  const ab = document.getElementById('alertBar');
  if (budget > 0 && spent > budget) {
    ab.style.display = 'flex';
    ab.className = 'alert-bar danger';
    ab.innerHTML = `🚨 <strong>Budget exceeded!</strong> You've overspent by ${fmt(spent - budget)}.`;
  } else if (budget > 0 && pct >= 80) {
    ab.style.display = 'flex';
    ab.className = 'alert-bar warn';
    ab.innerHTML = `⚠️ <strong>Heads up!</strong> You've used ${Math.round(pct)}% of your monthly budget.`;
  } else {
    ab.style.display = 'none';
  }

  /* Tips card hints */
  document.getElementById('tipRemaining').textContent = fmt(Math.max(rem, 0));
  document.getElementById('tipSpent').textContent = `${fmt(spent)} spent this month`;
}

/* ==============================================
   ADD EXPENSE
   ============================================== */
function validateForm() {
  let ok = true;
  const set = (id, errId, msg) => {
    const el = document.getElementById(id);
    const er = document.getElementById(errId);
    if (msg) { er.textContent = msg; el.classList.add('err'); ok = false; }
    else { er.textContent = ''; el.classList.remove('err'); }
  };
  const name = document.getElementById('eName').value.trim();
  set('eName', 'errName', name ? '' : 'Expense name is required.');
  const amt = parseFloat(document.getElementById('eAmount').value);
  set('eAmount', 'errAmount', (!amt || amt <= 0) ? 'Enter a valid amount.' : '');
  const cat = document.getElementById('eCategory').value;
  set('eCategory', 'errCat', cat ? '' : 'Please select a category.');
  const dt = document.getElementById('eDate').value;
  set('eDate', 'errDate', dt ? '' : 'Please select a date.');
  return ok;
}

document.getElementById('expenseForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;
  const exp = {
    id: uid(),
    name: document.getElementById('eName').value.trim(),
    amount: parseFloat(document.getElementById('eAmount').value),
    category: document.getElementById('eCategory').value,
    date: document.getElementById('eDate').value,
    note: document.getElementById('eNote').value.trim(),
  };
  const all = loadExp();
  all.push(exp);
  saveExp(all);
  document.getElementById('expenseForm').reset();
  document.getElementById('eDate').value = today();
  toast(`✅ "${exp.name}" added!`, 'success');
  renderAll();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('expenseForm').reset();
  document.getElementById('eDate').value = today();
  ['eName', 'eAmount', 'eCategory', 'eDate'].forEach(id => document.getElementById(id).classList.remove('err'));
  ['errName', 'errAmount', 'errCat', 'errDate'].forEach(id => document.getElementById(id).textContent = '');
});

/* ==============================================
   EXPENSE LIST
   ============================================== */
function getFiltered() {
  const all = loadExp();
  const search = document.getElementById('searchInput').value.trim().toLowerCase();
  const cat = document.getElementById('filterCat').value;
  const date = document.getElementById('filterDate').value;
  return all.filter(e =>
    (!search || e.name.toLowerCase().includes(search) || e.category.toLowerCase().includes(search)) &&
    (!cat || e.category === cat) &&
    (!date || e.date === date)
  );
}

function renderExpenses() {
  const filtered = getFiltered();
  const all = loadExp();
  const container = document.getElementById('expenseList');
  document.getElementById('filterInfo').textContent =
    filtered.length === all.length
      ? `Showing all ${all.length} expense${all.length !== 1 ? 's' : ''}`
      : `Showing ${filtered.length} of ${all.length} expenses`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">${all.length === 0 ? 'No expenses yet' : 'No results found'}</p>
        <p class="empty-desc">${all.length === 0 ? 'Add your first expense above!' : 'Try adjusting search or filters.'}</p>
      </div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  container.innerHTML = sorted.map(e => {
    const c = CATS[e.category] || CATS.Other;
    return `
      <div class="expense-item">
        <div class="exp-icon ${c.cls}">${c.icon}</div>
        <div class="exp-info">
          <p class="exp-name">${esc(e.name)}</p>
          <p class="exp-meta">
            <span class="exp-cat">${e.category}</span>
            ${e.note ? `<span class="exp-note"> · ${esc(e.note)}</span>` : ''}
          </p>
        </div>
        <span class="exp-date">${fmtDt(e.date)}</span>
        <span class="exp-amount">-${fmt(e.amount)}</span>
        <button class="del-btn" onclick="confirmDelete('${e.id}','${esc(e.name).replace(/'/g, "\\'")}')">🗑️</button>
      </div>`;
  }).join('');
}

/* Filters */
['searchInput', 'filterCat', 'filterDate'].forEach(id =>
  document.getElementById(id).addEventListener('input', renderExpenses)
);
document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterCat').value = '';
  document.getElementById('filterDate').value = '';
  renderExpenses();
});

/* Delete */
function confirmDelete(id, name) {
  showModal('Delete Expense', `Delete "${name}"? This cannot be undone.`, () => {
    saveExp(loadExp().filter(e => e.id !== id));
    renderAll();
    toast('🗑️ Expense deleted.', 'error');
  });
}

/* ==============================================
   CHARTS / ANALYTICS
   ============================================== */
function renderCharts() {
  const exp = loadExp();
  const budget = loadBudget();
  const spent = total(exp);
  const catMap = byCat(exp);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridC = isDark ? '#1C2E44' : '#D8E0EC';
  const txtC = isDark ? '#8EA8C8' : '#3A4A6B';
  const cats = Object.keys(catMap);
  const amts = cats.map(c => catMap[c]);
  const colors = cats.map(c => (CATS[c] || CATS.Other).color);

  /* Doughnut */
  if (catChart) catChart.destroy();
  const ctx1 = document.getElementById('catChart').getContext('2d');
  if (cats.length === 0) {
    document.getElementById('chartLegend').innerHTML = '<p style="color:var(--text-m);font-size:13px">No data yet.</p>';
    ctx1.clearRect(0, 0, 300, 300);
  } else {
    catChart = new Chart(ctx1, {
      type: 'doughnut',
      data: { labels: cats, datasets: [{ data: amts, backgroundColor: colors, borderWidth: 2, borderColor: isDark ? '#111D30' : '#fff', hoverOffset: 8 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmt(ctx.parsed) + ' (' + Math.round((ctx.parsed / spent) * 100) + '%)' } }
        }
      }
    });
    document.getElementById('chartLegend').innerHTML = cats.map((c, i) =>
      `<div class="legend-item"><span class="legend-dot" style="background:${colors[i]}"></span>${c}</div>`
    ).join('');
  }

  /* Bar */
  if (barChart) barChart.destroy();
  const ctx2 = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: ['This Month'],
      datasets: [
        { label: 'Budget', data: [budget], backgroundColor: 'rgba(21,101,192,.75)', borderColor: '#1565C0', borderWidth: 2, borderRadius: 8, borderSkipped: false },
        { label: 'Spent', data: [spent], backgroundColor: spent > budget ? 'rgba(230,36,41,.8)' : 'rgba(66,165,245,.75)', borderColor: spent > budget ? '#E62429' : '#42A5F5', borderWidth: 2, borderRadius: 8, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: txtC, padding: 16 } }, tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fmt(ctx.parsed.y) } } },
      scales: {
        x: { grid: { color: gridC }, ticks: { color: txtC } },
        y: { grid: { color: gridC }, ticks: { color: txtC, callback: v => '₹' + v.toLocaleString('en-IN') } }
      }
    }
  });

  /* Breakdown bars */
  const bl = document.getElementById('breakdownList');
  if (cats.length === 0) { bl.innerHTML = '<p style="color:var(--text-m);font-size:13px;text-align:center;padding:20px 0">No expenses yet.</p>'; return; }
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxA = sorted[0][1];
  bl.innerHTML = sorted.map(([cat, amt]) => {
    const m = CATS[cat] || CATS.Other;
    const p = Math.round((amt / spent) * 100);
    const w = Math.round((amt / maxA) * 100);
    return `
      <div class="breakdown-row">
        <div class="breakdown-top">
          <div class="breakdown-ico" style="background:${m.color}22">${m.icon}</div>
          <span class="breakdown-name">${cat}</span>
          <span class="breakdown-pct">${p}%</span>
          <span class="breakdown-amt">${fmt(amt)}</span>
        </div>
        <div class="bd-bar-wrap"><div class="bd-bar" style="width:${w}%;background:${m.color}"></div></div>
      </div>`;
  }).join('');
}

/* ==============================================
   BUDGET SECTION
   ============================================== */
function renderBudget() {
  const exp = loadExp();
  const budget = loadBudget();
  const spent = total(exp);
  const rem = Math.max(budget - spent, 0);
  const pct = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (budget > 0) document.getElementById('budgetInput').value = budget;
  document.getElementById('bBudget').textContent = fmt(budget);
  document.getElementById('bSpent').textContent = fmt(spent);
  document.getElementById('bLeft').textContent = fmt(rem);
  document.getElementById('donutPct').textContent = pct + '%';

  /* Donut */
  if (donutChart) donutChart.destroy();
  const dc = document.getElementById('donutChart').getContext('2d');
  const spentColor = pct >= 100 ? '#E62429' : pct >= 80 ? '#f59e0b' : '#1565C0';
  const donutRemainColor = isDark ? '#1C2E44' : '#D8E0EC';
  donutChart = new Chart(dc, {
    type: 'doughnut',
    data: { datasets: [{ data: budget > 0 ? [spent, Math.max(budget - spent, 0)] : [0, 1], backgroundColor: [spentColor, donutRemainColor], borderWidth: 0 }] },
    options: { responsive: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 700, easing: 'easeInOutQuart' } }
  });

  /* Alerts */
  const sa = document.getElementById('spendAlerts');
  if (budget === 0) {
    sa.innerHTML = `<div class="sal-item sal-warn">⚠️ No budget set. Enter your monthly limit above.</div>`;
  } else if (spent > budget) {
    sa.innerHTML = `<div class="sal-item sal-danger">🚨 Budget exceeded by ${fmt(spent - budget)}! Review your spending.</div>`;
  } else if (pct >= 80) {
    sa.innerHTML = `<div class="sal-item sal-warn">⚠️ You've used ${pct}% of your budget. Only ${fmt(rem)} left.</div>`;
  } else {
    sa.innerHTML = `<div class="sal-item sal-ok">✅ On track! ${fmt(rem)} remaining of your ${fmt(budget)} budget (${pct}% used).</div>`;
  }

  /* Category bars */
  const catMap = byCat(exp);
  const cl = document.getElementById('budgetCatList');
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) { cl.innerHTML = '<p style="color:var(--text-m);font-size:13px;text-align:center;padding:20px 0">No expenses yet.</p>'; return; }
  cl.innerHTML = sorted.map(([cat, amt]) => {
    const m = CATS[cat] || CATS.Other;
    const p = spent > 0 ? Math.round((amt / spent) * 100) : 0;
    return `
      <div class="cat-row">
        <div class="cat-top">
          <span class="cat-ico">${m.icon}</span>
          <span class="cat-name">${cat}</span>
          <span class="cat-amt">${fmt(amt)}</span>
          <span class="cat-pct">${p}%</span>
        </div>
        <div class="cat-bar-wrap"><div class="cat-bar-fill" style="width:${p}%;background:${m.color}"></div></div>
      </div>`;
  }).join('');
}

/* Save budget */
document.getElementById('saveBudgetBtn').addEventListener('click', () => {
  const v = parseFloat(document.getElementById('budgetInput').value);
  if (!v || v <= 0) { toast('Enter a valid budget amount.', 'error'); return; }
  saveBudget(v);
  renderAll();
  toast(`✅ Budget set to ${fmt(v)}!`, 'success');
});

/* ==============================================
   MODAL
   ============================================== */
function showModal(title, desc, onOk) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalDesc').textContent = desc;
  document.getElementById('modal').style.display = 'flex';
  _modalCb = onOk;
}
function hideModal() {
  document.getElementById('modal').style.display = 'none';
  _modalCb = null;
}
document.getElementById('modalCancel').addEventListener('click', hideModal);
document.getElementById('modalOk').addEventListener('click', () => { if (_modalCb) _modalCb(); hideModal(); });
document.getElementById('modal').addEventListener('click', e => { if (e.target === document.getElementById('modal')) hideModal(); });

/* ==============================================
   EXPORT + CLEAR ALL
   ============================================== */
document.getElementById('exportBtn').addEventListener('click', () => {
  const expenses = loadExp();
  if (!expenses || expenses.length === 0) {
    toast('No expense data available to export.', 'error');
    return;
  }

  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '';
    const stringified = String(str);
    if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n')) {
      return `"${stringified.replace(/"/g, '""')}"`;
    }
    return stringified;
  };

  const headers = ['Expense Name', 'Amount', 'Category', 'Date', 'Note'];
  const rows = [headers.map(escapeCsv).join(',')];

  expenses.forEach(exp => {
    const row = [
      escapeCsv(exp.title),
      escapeCsv(exp.amount),
      escapeCsv(exp.cat),
      escapeCsv(exp.date),
      escapeCsv(exp.note || '')
    ];
    rows.push(row.join(','));
  });

  const csvContent = rows.join('\r\n');
  const fileName = `PocketTrack_Expenses_${today()}.csv`;

  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
  const objectURL = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectURL;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectURL);
  }, 1000);

  toast('📥 Data exported!', 'success');
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
  showModal('Clear All Data', 'This permanently deletes all expenses and resets your budget. Cannot be undone.', () => {
    localStorage.removeItem(LS_EXP);
    localStorage.removeItem(LS_BUDGET);
    renderAll();
    toast('🗑️ All data cleared.', 'error');
  });
});

/* ==============================================
   RENDER ALL
   ============================================== */
function renderAll() {
  renderDashboard();
  renderExpenses();
  renderCharts();
  renderBudget();
}

/* ==============================================
   INIT
   ============================================== */
function init() {
  seedData();
  applyTheme(loadTheme());
  document.getElementById('eDate').value = today();
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
