/* ============================================================
   EXPENSE & BUDGET VISUALIZER — script.js
   Vanilla JS | localStorage | Chart.js
   Features: CRUD, auto-balance, pie chart, sort, limit highlight,
             dark mode, date input, monthly summary
   ============================================================ */

'use strict';

/* ── CONSTANTS ── */
const STORAGE_KEY_TRANSACTIONS = 'ebv_transactions';
const STORAGE_KEY_LIMIT        = 'ebv_limit';
const STORAGE_KEY_THEME        = 'ebv_theme';

const CATEGORY_EMOJI = {
  Food:      '🍔',
  Transport: '🚌',
  Fun:       '🎮',
  Lifestyle: '✨',
};

const CATEGORY_COLORS = {
  Food:      '#48bb78',
  Transport: '#4299e1',
  Fun:       '#ed8936',
  Lifestyle: '#9f7aea',
};

/* ── STATE ── */
let transactions = [];   // Array of { id, name, amount, category, date, createdAt }
let spendingLimit = 0;   // 0 = no limit set
let chartInstance = null; // Chart.js instance (singleton)

/* ================================================================
   1. PERSISTENCE — LocalStorage helpers
   ================================================================ */

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    transactions = raw ? JSON.parse(raw) : [];
  } catch {
    transactions = [];
  }

  spendingLimit = Number(localStorage.getItem(STORAGE_KEY_LIMIT)) || 0;

  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
  applyTheme(savedTheme);
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
}

function saveLimit() {
  localStorage.setItem(STORAGE_KEY_LIMIT, String(spendingLimit));
}

/* ================================================================
   2. THEME — Dark / Light mode (Optional Challenge)
   ================================================================ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
  // Re-render chart so colors adapt to the new theme background
  renderChart();
}

/* ================================================================
   3. BALANCE — Calculate and display total
   ================================================================ */

function getTotalSpent() {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

function renderBalance() {
  const total = getTotalSpent();
  const balanceEl  = document.getElementById('totalBalance');
  const warningEl  = document.getElementById('limitWarning');
  const balanceCard = document.querySelector('.balance-card');

  balanceEl.textContent = formatCurrency(total);

  // Optional Challenge: highlight if over limit
  const isOverLimit = spendingLimit > 0 && total > spendingLimit;
  warningEl.hidden = !isOverLimit;
  balanceCard.classList.toggle('over-limit', isOverLimit);
}

/* ================================================================
   4. LIMIT — Set spending limit (Optional Challenge)
   ================================================================ */

function initLimit() {
  const input = document.getElementById('limitInput');
  if (spendingLimit > 0) input.value = spendingLimit;

  document.getElementById('setLimitBtn').addEventListener('click', () => {
    const val = Number(input.value);
    if (isNaN(val) || val < 0) return;
    spendingLimit = val;
    saveLimit();
    renderBalance(); // immediately check against new limit
  });
}

/* ================================================================
   5. FORM — Validate and add transaction
   ================================================================ */

function clearErrors() {
  ['itemName', 'amount', 'category', 'transactionDate'].forEach(id => {
    const input = document.getElementById(id);
    const error = document.getElementById(id + 'Error');
    if (input) input.classList.remove('error');
    if (error) error.textContent = '';
  });
}

function showError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(fieldId + 'Error');
  input.classList.add('error');
  error.textContent = message;
}

function validateForm(name, amount, category, date) {
  let valid = true;

  if (!name.trim()) {
    showError('itemName', 'Nama item tidak boleh kosong.');
    valid = false;
  }

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    showError('amount', 'Masukkan jumlah yang valid (> 0).');
    valid = false;
  }

  if (!category) {
    showError('category', 'Pilih salah satu kategori.');
    valid = false;
  }

  if (!date) {
    showError('transactionDate', 'Pilih tanggal transaksi.');
    valid = false;
  }

  return valid;
}

function addTransaction(name, amount, category, date) {
  const transaction = {
    id:        crypto.randomUUID(),
    name:      name.trim(),
    amount:    Number(amount),
    category,
    date,                   // "YYYY-MM-DD" ISO string
    createdAt: Date.now(),
  };
  transactions.push(transaction);
  saveTransactions();
}

// Returns today's date as "YYYY-MM-DD" for default value on the date input
function getTodayISO() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, '0');
  const d   = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function initForm() {
  const form      = document.getElementById('transactionForm');
  const dateInput = document.getElementById('transactionDate');

  // Set default value to today
  dateInput.value = getTodayISO();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const name     = document.getElementById('itemName').value;
    const amount   = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date     = dateInput.value;

    if (!validateForm(name, amount, category, date)) return;

    addTransaction(name, amount, category, date);

    // Reset form then restore default date
    form.reset();
    dateInput.value = getTodayISO();

    renderAll();

    // Scroll the new item into view
    const list = document.getElementById('transactionList');
    list.firstElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* ================================================================
   6. TRANSACTION LIST — Render + Delete + Sort (Optional Challenge)
   ================================================================ */

function getSortedTransactions() {
  const sortBy = document.getElementById('sortBy').value;
  const clone  = [...transactions];

  switch (sortBy) {
    case 'date-desc':   return clone.sort((a, b) => b.createdAt - a.createdAt);
    case 'date-asc':    return clone.sort((a, b) => a.createdAt - b.createdAt);
    case 'amount-desc': return clone.sort((a, b) => b.amount - a.amount);
    case 'amount-asc':  return clone.sort((a, b) => a.amount - b.amount);
    case 'category':    return clone.sort((a, b) => a.category.localeCompare(b.category));
    default:            return clone;
  }
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  // dateStr is "YYYY-MM-DD"; parse as local date to avoid UTC offset shift
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function createTransactionItem(transaction) {
  const { id, name, amount, category, date } = transaction;
  const emoji       = CATEGORY_EMOJI[category] || '💰';
  const dateDisplay = date ? formatDateDisplay(date) : '';

  const li = document.createElement('li');
  li.className = 'transaction-item';
  li.dataset.id = id;

  li.innerHTML = `
    <span class="category-badge badge-${category}" aria-hidden="true">${emoji}</span>
    <div class="item-info">
      <p class="item-name" title="${escapeHtml(name)}">${escapeHtml(name)}</p>
      <p class="item-category">${category}${dateDisplay ? ` · <span class="item-date">${dateDisplay}</span>` : ''}</p>
    </div>
    <span class="item-amount">${formatCurrency(amount)}</span>
    <button
      class="btn btn-danger"
      aria-label="Hapus transaksi ${escapeHtml(name)}"
      data-id="${id}"
    >✕</button>
  `;

  // Delete button handler
  li.querySelector('.btn-danger').addEventListener('click', () => {
    deleteTransaction(id);
  });

  return li;
}

function renderTransactionList() {
  const listEl   = document.getElementById('transactionList');
  const emptyEl  = document.getElementById('listEmpty');
  const sorted   = getSortedTransactions();

  listEl.innerHTML = '';

  if (sorted.length === 0) {
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  const fragment = document.createDocumentFragment();
  sorted.forEach(t => fragment.appendChild(createTransactionItem(t)));
  listEl.appendChild(fragment);
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  renderAll();
}

function initSort() {
  document.getElementById('sortBy').addEventListener('change', renderTransactionList);
}

/* ================================================================
   7. CHART — Pie chart with Chart.js (auto-update)
   ================================================================ */

function getCategoryTotals() {
  const totals = {};
  transactions.forEach(({ category, amount }) => {
    totals[category] = (totals[category] || 0) + amount;
  });
  return totals;
}

function renderChart() {
  const canvas   = document.getElementById('expenseChart');
  const emptyEl  = document.getElementById('chartEmpty');
  const totals   = getCategoryTotals();
  const labels   = Object.keys(totals);
  const data     = Object.values(totals);

  if (labels.length === 0) {
    emptyEl.style.display = 'flex';
    canvas.style.display  = 'none';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  emptyEl.style.display = 'none';
  canvas.style.display  = 'block';

  const isDark       = document.documentElement.getAttribute('data-theme') === 'dark';
  const legendColor  = isDark ? '#e2e8f0' : '#1a202c';
  const bgColors     = labels.map(l => CATEGORY_COLORS[l] || '#a0aec0');
  const borderColors = labels.map(() => isDark ? '#1a1d27' : '#ffffff');

  if (chartInstance) {
    // Update existing chart instead of recreating (smoother)
    chartInstance.data.labels         = labels;
    chartInstance.data.datasets[0].data         = data;
    chartInstance.data.datasets[0].backgroundColor = bgColors;
    chartInstance.data.datasets[0].borderColor     = borderColors;
    chartInstance.options.plugins.legend.labels.color = legendColor;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor:  bgColors,
        borderColor:      borderColors,
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      animation: { duration: 400 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: legendColor,
            padding: 16,
            font: { size: 13, family: "'Segoe UI', system-ui, sans-serif" },
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const value = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((value / total) * 100).toFixed(1);
              return ` ${formatCurrency(value)}  (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* ================================================================
   8. MONTHLY SUMMARY — Group by month/year (Optional Challenge)
   ================================================================ */

// Returns "YYYY-MM" key from a date string "YYYY-MM-DD"
function getMonthKey(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 7); // "YYYY-MM"
}

// Returns human-readable label e.g. "September 2026"
function formatMonthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  const date   = new Date(y, m - 1, 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Collect all unique months that exist in transactions, sorted newest first
function getAvailableMonths() {
  const keys = new Set();
  transactions.forEach(t => {
    const k = getMonthKey(t.date);
    if (k) keys.add(k);
  });
  return [...keys].sort((a, b) => b.localeCompare(a)); // newest first
}

function renderMonthlySummary() {
  const selector    = document.getElementById('monthSelector');
  const contentEl   = document.getElementById('summaryContent');
  const emptyEl     = document.getElementById('summaryEmpty');
  const totalEl     = document.getElementById('summaryTotal');
  const breakdownEl = document.getElementById('summaryBreakdown');

  // Rebuild dropdown options, preserving current selection if still valid
  const prevSelected = selector.value;
  const months       = getAvailableMonths();

  // Keep only the placeholder + fresh month options
  selector.innerHTML = '<option value="">-- Pilih Bulan --</option>';
  months.forEach(key => {
    const opt   = document.createElement('option');
    opt.value   = key;
    opt.textContent = formatMonthLabel(key);
    selector.appendChild(opt);
  });

  // Restore previous selection if it still exists
  if (prevSelected && months.includes(prevSelected)) {
    selector.value = prevSelected;
  }

  const selected = selector.value;

  if (!selected) {
    contentEl.hidden = true;
    emptyEl.hidden   = false;
    emptyEl.textContent = months.length === 0
      ? 'Belum ada transaksi. Tambahkan dulu!'
      : 'Pilih bulan untuk melihat ringkasan.';
    return;
  }

  // Filter transactions for the selected month
  const filtered = transactions.filter(t => getMonthKey(t.date) === selected);

  if (filtered.length === 0) {
    contentEl.hidden = true;
    emptyEl.hidden   = false;
    emptyEl.textContent = 'Tidak ada transaksi di bulan ini.';
    return;
  }

  // Calculate totals
  const grandTotal = filtered.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = {};
  filtered.forEach(({ category, amount }) => {
    byCategory[category] = (byCategory[category] || 0) + amount;
  });

  // Render
  totalEl.textContent = formatCurrency(grandTotal);

  breakdownEl.innerHTML = '';
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1]) // highest first
    .forEach(([cat, total]) => {
      const pct  = ((total / grandTotal) * 100).toFixed(1);
      const emoji = CATEGORY_EMOJI[cat] || '💰';
      const li   = document.createElement('li');
      li.className = 'summary-breakdown-item';
      li.innerHTML = `
        <span class="summary-cat-badge badge-${cat}">${emoji}</span>
        <span class="summary-cat-name">${cat}</span>
        <span class="summary-cat-pct">${pct}%</span>
        <span class="summary-cat-amount">${formatCurrency(total)}</span>
      `;
      breakdownEl.appendChild(li);
    });

  contentEl.hidden = false;
  emptyEl.hidden   = true;
}

function initMonthlySummary() {
  document.getElementById('monthSelector').addEventListener('change', renderMonthlySummary);
}

/* ================================================================
   9. RENDER ALL — Single function to update every UI section
   ================================================================ */

function renderAll() {
  renderBalance();
  renderTransactionList();
  renderChart();
  renderMonthlySummary();
}

/* ================================================================
   10. UTILITY
   ================================================================ */

// Prevent XSS when inserting user-provided text into innerHTML
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ================================================================
   11. INIT — Run everything on DOMContentLoaded
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();        // Pull saved data from localStorage
  initLimit();              // Wire up limit controls
  initForm();               // Wire up form submit (sets default date too)
  initSort();               // Wire up sort dropdown
  initMonthlySummary();     // Wire up month selector
  renderAll();              // Initial render

  // Theme toggle button
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
});
