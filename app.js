import {
  DEFAULT_MONTH_GOAL,
  DEFAULT_UNIT_PRICE,
  createCustomEntry,
  createSaleEntry,
  createSyncRequest,
  currentMonthKey,
  formatCurrency,
  getDailyChartData,
  getDailyGroups,
  getGoalProgress,
  getMonthlyChartData,
  getMonthSummary,
  prepareFeishuRecord,
  todayISO,
  updateEntry,
} from './app-core.mjs';

const storageKeys = {
  entries: 'income-tracker.entries',
  unitPrice: 'income-tracker.unitPrice',
  goal: 'income-tracker.goal',
  syncQueue: 'income-tracker.syncQueue',
  syncConfig: 'income-tracker.syncConfig',
};

const state = {
  entries: readJSON(storageKeys.entries, []),
  unitPrice: readNumber(storageKeys.unitPrice, DEFAULT_UNIT_PRICE),
  goal: readNumber(storageKeys.goal, DEFAULT_MONTH_GOAL),
  syncQueue: readJSON(storageKeys.syncQueue, []),
  syncConfig: readJSON(storageKeys.syncConfig, null),
  selectedDate: todayISO(),
  editingId: null,
};

const incomeQuotes = [
  '又一份信任，到账了。',
  '看，你的专业，正在变现。',
  '一个家庭，因你而变得更健康。',
  '你的方案，又改变了一个人。',
  '现金流，是市场投给你的赞成票。',
  '你帮助的人，正在用钱包为你点赞。',
  '这不仅是收入，是你自由的砖。',
  '你的时间与专业，越来越值钱。',
  '看，你的飞轮，又多转了一圈。',
  '你值得。这一切都是你应得的。',
];

const elements = {
  monthIncome: document.querySelector('#monthIncome'),
  goalText: document.querySelector('#goalText'),
  remainingText: document.querySelector('#remainingText'),
  percentText: document.querySelector('#percentText'),
  salesText: document.querySelector('#salesText'),
  water: document.querySelector('#water'),
  bankTitle: document.querySelector('#bankTitle'),
  bankSubtitle: document.querySelector('#bankSubtitle'),
  goalOrbPercent: document.querySelector('#goalOrbPercent'),
  quickAdd: document.querySelector('#quickAdd'),
  quickDateHint: document.querySelector('#quickDateHint'),
  advancedToggle: document.querySelector('#advancedToggle'),
  advancedToggleText: document.querySelector('#advancedToggleText'),
  selectedDateLabel: document.querySelector('#selectedDateLabel'),
  todayDateButton: document.querySelector('#todayDateButton'),
  entryForm: document.querySelector('#entryForm'),
  entryDate: document.querySelector('#entryDate'),
  entryCount: document.querySelector('#entryCount'),
  customToggle: document.querySelector('#customToggle'),
  customAmountWrap: document.querySelector('#customAmountWrap'),
  customAmount: document.querySelector('#customAmount'),
  entryNote: document.querySelector('#entryNote'),
  formPreview: document.querySelector('#formPreview'),
  entrySubmit: document.querySelector('#entrySubmit'),
  cancelEdit: document.querySelector('#cancelEdit'),
  deleteEntry: document.querySelector('#deleteEntry'),
  message: document.querySelector('#message'),
  settingsToggle: document.querySelector('#settingsToggle'),
  settingsPanel: document.querySelector('#settingsPanel'),
  unitPriceInput: document.querySelector('#unitPriceInput'),
  goalInput: document.querySelector('#goalInput'),
  saveSettings: document.querySelector('#saveSettings'),
  dailyChart: document.querySelector('#dailyChart'),
  yearChartToggle: document.querySelector('#yearChartToggle'),
  yearChartToggleText: document.querySelector('#yearChartToggleText'),
  monthlyChart: document.querySelector('#monthlyChart'),
  syncStatusText: document.querySelector('#syncStatusText'),
  syncHint: document.querySelector('#syncHint'),
  syncEndpointInput: document.querySelector('#syncEndpointInput'),
  saveSyncConfig: document.querySelector('#saveSyncConfig'),
  syncNow: document.querySelector('#syncNow'),
  recordsList: document.querySelector('#recordsList'),
  entryCountText: document.querySelector('#entryCountText'),
};

elements.entryDate.value = state.selectedDate;
elements.unitPriceInput.value = state.unitPrice;
elements.goalInput.value = state.goal;
elements.syncEndpointInput.value = state.syncConfig?.endpoint || '';
elements.entryForm.classList.add('hidden');

elements.quickAdd.addEventListener('click', () => {
  addEntry(
    createSaleEntry({
      date: state.selectedDate,
      count: 1,
      unitPrice: state.unitPrice,
      note: '',
    }),
    state.selectedDate === todayISO() ? '已记一单' : `已补记 ${formatDateLabel(state.selectedDate)} 一单`,
  );
});

elements.entryForm.addEventListener('submit', (event) => {
  event.preventDefault();

  try {
    if (state.editingId) {
      saveEditedEntry();
      return;
    }

    addEntry(createEntryFromForm(), '已记录这一笔');
    resetEntryForm();
  } catch (error) {
    showMessage(error.message, true);
  }
});

elements.customToggle.addEventListener('change', () => {
  elements.customAmountWrap.classList.toggle('hidden', !elements.customToggle.checked);
  elements.entryCount.disabled = elements.customToggle.checked;
  updatePreview();
});

elements.entryDate.addEventListener('change', () => {
  setSelectedDate(elements.entryDate.value, false);
});

elements.todayDateButton.addEventListener('click', () => {
  setSelectedDate(todayISO(), true);
});

elements.entryCount.addEventListener('input', updatePreview);
elements.customAmount.addEventListener('input', updatePreview);

elements.cancelEdit.addEventListener('click', () => {
  state.editingId = null;
  resetEntryForm();
  showMessage('已取消修改');
  render();
});

elements.deleteEntry.addEventListener('click', () => {
  deleteEditingEntry();
});

elements.settingsToggle.addEventListener('click', () => {
  const isOpening = elements.settingsPanel.classList.contains('hidden');
  elements.settingsPanel.classList.toggle('hidden', !isOpening);
  if (isOpening) {
    elements.settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

elements.saveSettings.addEventListener('click', () => {
  const nextUnitPrice = Number(elements.unitPriceInput.value);
  const nextGoal = Number(elements.goalInput.value);

  if (!Number.isFinite(nextUnitPrice) || nextUnitPrice <= 0 || !Number.isFinite(nextGoal) || nextGoal <= 0) {
    showMessage('默认单价和月目标都需要大于 0', true);
    return;
  }

  state.unitPrice = nextUnitPrice;
  localStorage.setItem(storageKeys.unitPrice, String(state.unitPrice));
  saveGoal(nextGoal, false);
  showMessage('设置已保存');
  updatePreview();
  render();
});

elements.saveSyncConfig.addEventListener('click', () => {
  const endpoint = elements.syncEndpointInput.value.trim();

  if (!endpoint) {
    state.syncConfig = null;
    localStorage.removeItem(storageKeys.syncConfig);
    showMessage('同步地址已清空');
    render();
    return;
  }

  try {
    const url = new URL(endpoint);
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error();
    }
  } catch {
    showMessage('同步地址需要是 http 或 https 开头的链接', true);
    return;
  }

  state.syncConfig = { endpoint };
  localStorage.setItem(storageKeys.syncConfig, JSON.stringify(state.syncConfig));
  showMessage('同步地址已保存');
  render();
  syncPendingRecords();
});

elements.syncNow.addEventListener('click', () => {
  syncPendingRecords();
});

elements.yearChartToggle.addEventListener('click', () => {
  const isOpening = elements.monthlyChart.classList.contains('hidden');
  elements.monthlyChart.classList.toggle('hidden', !isOpening);
  elements.yearChartToggle.setAttribute('aria-expanded', String(isOpening));
  elements.yearChartToggleText.textContent = isOpening ? '收起' : '点击查看';
});

elements.advancedToggle.addEventListener('click', () => {
  setAdvancedOpen(elements.entryForm.classList.contains('hidden'));
});

elements.dailyChart.addEventListener('click', (event) => {
  const button = event.target.closest('[data-date]');
  if (!button) {
    return;
  }

  setSelectedDate(button.dataset.date, true);
  setAdvancedOpen(true);
  elements.entryForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

elements.recordsList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-edit-id]');
  if (!button) {
    return;
  }

  startEditingEntry(button.dataset.editId);
});

function addEntry(entry, text) {
  state.entries = [entry, ...state.entries];
  queueForSync(entry);
  localStorage.setItem(storageKeys.entries, JSON.stringify(state.entries));
  showMessage(text);
  render();
  syncPendingRecords();
}

function saveEditedEntry() {
  const originalEntry = state.entries.find((entry) => entry.id === state.editingId);
  if (!originalEntry) {
    throw new Error('找不到要修改的记录');
  }

  const updatedEntry = updateEntry(originalEntry, {
    date: elements.entryDate.value,
    count: elements.entryCount.value,
    unitPrice: state.unitPrice,
    amount: elements.customAmount.value,
    note: elements.entryNote.value,
    isCustom: elements.customToggle.checked,
  });

  state.entries = state.entries.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry));
  queueForSync(updatedEntry);
  localStorage.setItem(storageKeys.entries, JSON.stringify(state.entries));
  state.editingId = null;
  resetEntryForm();
  showMessage('这笔记录已修改');
  render();
  syncPendingRecords();
}

function deleteEditingEntry() {
  if (!state.editingId) {
    return;
  }

  const shouldDelete = window.confirm('确定删除这笔记录吗？删除后本机账本里就没有这笔了。');
  if (!shouldDelete) {
    return;
  }

  const deletedId = state.editingId;
  state.entries = state.entries.filter((entry) => entry.id !== deletedId);
  state.syncQueue = state.syncQueue.filter((item) => item.id !== deletedId);
  localStorage.setItem(storageKeys.entries, JSON.stringify(state.entries));
  localStorage.setItem(storageKeys.syncQueue, JSON.stringify(state.syncQueue));
  state.editingId = null;
  resetEntryForm();
  showMessage('这笔记录已删除');
  render();
}

function render() {
  const monthKey = currentMonthKey();
  const yearKey = monthKey.slice(0, 4);
  const summary = getMonthSummary(state.entries, monthKey);
  const progress = getGoalProgress(summary.totalIncome, state.goal);
  const groups = getDailyGroups(state.entries, monthKey);
  const dailyChart = getDailyChartData(state.entries, monthKey, todayISO());
  const monthlyChart = getMonthlyChartData(state.entries, yearKey);

  elements.monthIncome.textContent = formatCurrency(summary.totalIncome);
  elements.goalText.textContent = formatCurrency(state.goal);
  elements.remainingText.textContent = formatCurrency(progress.remaining);
  elements.percentText.textContent = `${progress.percent}%`;
  elements.salesText.textContent = `${summary.totalSales} 单`;
  elements.entryCountText.textContent = `${summary.entryCount} 笔`;
  elements.water.style.height = `${progress.visualPercent}%`;
  elements.goalOrbPercent.textContent = `${progress.percent}%`;
  elements.selectedDateLabel.textContent = formatDateLabel(state.selectedDate);
  elements.entryDate.value = state.selectedDate;
  elements.goalInput.value = state.goal;

  elements.quickAdd.querySelector('strong').textContent = `记入 ${formatCurrency(state.unitPrice)}`;
  elements.quickDateHint.textContent =
    state.selectedDate === todayISO() ? '今天成交后马上点' : `补记到 ${formatDateLabel(state.selectedDate)}`;

  if (progress.reached) {
    elements.bankTitle.textContent = '这个月目标已达成';
    elements.bankSubtitle.textContent = `已经超过目标 ${formatCurrency(summary.totalIncome - state.goal)}`;
  } else {
    elements.bankTitle.textContent = `还差 ${formatCurrency(progress.remaining)}`;
    elements.bankSubtitle.textContent = getDailyQuote();
  }

  renderDotChart(elements.dailyChart, dailyChart, '日', 'day');
  renderDotChart(elements.monthlyChart, monthlyChart, '', 'month');
  renderSyncStatus();
  renderRecords(groups);
  renderEditMode();
}

function queueForSync(entry) {
  const queued = {
    id: entry.id,
    status: 'pending',
    attempts: 0,
    payload: prepareFeishuRecord(entry),
    queuedAt: new Date().toISOString(),
  };
  state.syncQueue = [queued, ...state.syncQueue.filter((item) => item.id !== entry.id)];
  localStorage.setItem(storageKeys.syncQueue, JSON.stringify(state.syncQueue));
}

function renderSyncStatus() {
  const pendingCount = state.syncQueue.filter((item) => item.status === 'pending').length;
  const failedCount = state.syncQueue.filter((item) => item.status === 'failed').length;
  const syncingCount = state.syncQueue.filter((item) => item.status === 'syncing').length;

  if (!state.syncConfig) {
    elements.syncStatusText.textContent = pendingCount > 0 ? `${pendingCount} 条待配置` : '未配置';
    elements.syncHint.textContent =
      pendingCount > 0
        ? `已有 ${pendingCount} 条记录在本机排队。配置飞书后再同步。`
        : '记录会先保存在本机。接好飞书后，待同步记录会写入多维表格。';
    return;
  }

  if (syncingCount > 0) {
    elements.syncStatusText.textContent = '同步中';
    elements.syncHint.textContent = '正在把本机记录发送到你配置的同步地址。';
    return;
  }

  if (failedCount > 0) {
    elements.syncStatusText.textContent = `${failedCount} 条失败`;
    elements.syncHint.textContent = '同步失败的记录仍保留在本机，可以检查地址后重试。';
    return;
  }

  elements.syncStatusText.textContent = pendingCount > 0 ? `${pendingCount} 条待同步` : '已同步';
  elements.syncHint.textContent = pendingCount > 0 ? '待同步记录会自动发送到同步地址。' : '已发送到同步地址。';
}

async function syncPendingRecords() {
  if (!state.syncConfig?.endpoint) {
    renderSyncStatus();
    return;
  }

  const pendingItems = state.syncQueue.filter((item) => item.status === 'pending' || item.status === 'failed');
  if (pendingItems.length === 0) {
    renderSyncStatus();
    return;
  }

  for (const item of pendingItems) {
    updateQueueItem(item.id, {
      status: 'syncing',
      attempts: Number(item.attempts || 0) + 1,
      lastTriedAt: new Date().toISOString(),
    });
    renderSyncStatus();

    try {
      const response = await fetch(state.syncConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createSyncRequest(item)),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      updateQueueItem(item.id, {
        status: 'synced',
        syncedAt: new Date().toISOString(),
        error: '',
      });
    } catch (error) {
      updateQueueItem(item.id, {
        status: 'failed',
        error: error.message || '同步失败',
      });
    }
  }

  render();
}

function updateQueueItem(id, patch) {
  state.syncQueue = state.syncQueue.map((item) => (item.id === id ? { ...item, ...patch } : item));
  localStorage.setItem(storageKeys.syncQueue, JSON.stringify(state.syncQueue));
}

function renderDotChart(container, items, suffix, type) {
  container.innerHTML = items
    .map((item) => {
      const fill = item.totalIncome > 0 ? Math.max(22, item.fillPercent) : 0;
      const title = `${item.label}${suffix} ${formatCurrency(item.totalIncome)} / ${item.entryCount} 笔`;
      const palette = getDopaminePalette(item.label);
      const isSelected = type === 'day' && item.key === state.selectedDate;
      const tag = type === 'day' ? 'button' : 'div';
      const buttonAttrs = type === 'day' ? ` type="button" data-date="${item.key}"` : '';
      return `
        <${tag} class="dot-item ${type}-item ${type === 'day' ? 'dot-button' : ''}"${buttonAttrs} title="${title}" aria-label="${title}">
          <div class="income-dot ${item.isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" style="--fill: ${fill}%; --dot-a: ${palette[0]}; --dot-b: ${palette[1]}; --dot-c: ${palette[2]};">
            <div class="dot-fill"></div>
            <span>${item.label}</span>
          </div>
          <div class="dot-money">${type === 'month' && item.totalIncome > 0 ? formatCompactCurrency(item.totalIncome) : ''}</div>
          <div class="dot-meta">${type === 'month' && item.entryCount > 0 ? `${item.entryCount}笔` : ''}</div>
        </${tag}>
      `;
    })
    .join('');
}

function setSelectedDate(date, showFeedback) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
    showMessage('请选择正确的日期', true);
    return;
  }

  state.selectedDate = date;
  elements.entryDate.value = date;
  if (showFeedback) {
    showMessage(`已切换到 ${formatDateLabel(date)}`);
  }
  updatePreview();
  render();
}

function setAdvancedOpen(isOpening) {
  elements.entryForm.classList.toggle('hidden', !isOpening);
  elements.advancedToggle.setAttribute('aria-expanded', String(isOpening));
  elements.advancedToggleText.textContent = isOpening ? '收起' : '展开';
}

function saveGoal(value, shouldRender = true) {
  const nextGoal = Number(value);
  if (!Number.isFinite(nextGoal) || nextGoal <= 0) {
    showMessage('月目标需要大于 0', true);
    return false;
  }

  state.goal = nextGoal;
  localStorage.setItem(storageKeys.goal, String(state.goal));
  showMessage('月目标已保存');
  if (shouldRender) {
    render();
  }
  return true;
}

function getDopaminePalette(label) {
  const palettes = [
    ['#ff4da6', '#c84dff', '#25e7d5'],
    ['#7a4dff', '#2e5bff', '#25e7d5'],
    ['#ff5f86', '#ff4da6', '#ffe85c'],
    ['#13c8bc', '#2e5bff', '#c36bff'],
    ['#ff3f7f', '#d84dff', '#ffd84d'],
  ];
  const index = String(label)
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[index % palettes.length];
}

function formatCompactCurrency(amount) {
  const number = Number(amount) || 0;
  if (number >= 10000) {
    return `¥${roundForLabel(number / 10000)}万`;
  }
  if (number >= 1000) {
    return `¥${roundForLabel(number / 1000)}k`;
  }
  return formatCurrency(number);
}

function roundForLabel(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateLabel(date) {
  const [, month, day] = String(date).split('-');
  if (!month || !day) {
    return '今天';
  }
  return `${Number(month)}月${Number(day)}日`;
}

function renderRecords(groups) {
  if (groups.length === 0) {
    elements.recordsList.innerHTML = '<div class="empty">这个月还没有记录。</div>';
    return;
  }

  elements.recordsList.innerHTML = groups
    .map(
      (group) => `
        <article class="day-group">
          <div class="day-head">
            <strong>${group.date}</strong>
            <strong>${formatCurrency(group.totalIncome)}</strong>
          </div>
          ${group.entries
            .map(
              (entry) => `
                <div class="entry-row">
                  <div class="entry-main">
                    <strong>${entry.isCustom ? '例外进账' : `${entry.count} 单`}</strong>
                    <span>${escapeHTML(entry.note || '无备注')}</span>
                  </div>
                  <div class="entry-side">
                    <div class="entry-amount">${formatCurrency(entry.amount)}</div>
                    <button class="record-action" type="button" data-edit-id="${escapeHTML(entry.id)}">修改</button>
                  </div>
                </div>
              `,
            )
            .join('')}
        </article>
      `,
    )
    .join('');
}

function createEntryFromForm() {
  return elements.customToggle.checked
    ? createCustomEntry({
        date: elements.entryDate.value,
        amount: elements.customAmount.value,
        note: elements.entryNote.value,
      })
    : createSaleEntry({
        date: elements.entryDate.value,
        count: elements.entryCount.value,
        unitPrice: state.unitPrice,
        note: elements.entryNote.value,
      });
}

function startEditingEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) {
    showMessage('找不到这笔记录', true);
    return;
  }

  state.editingId = id;
  state.selectedDate = entry.date;
  elements.entryDate.value = entry.date;
  elements.entryCount.value = entry.isCustom ? 1 : entry.count;
  elements.customToggle.checked = entry.isCustom;
  elements.customAmountWrap.classList.toggle('hidden', !entry.isCustom);
  elements.entryCount.disabled = entry.isCustom;
  elements.customAmount.value = entry.isCustom ? entry.amount : '';
  elements.entryNote.value = entry.note || '';
  setAdvancedOpen(true);
  updatePreview();
  render();
  elements.entryForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  showMessage('正在修改这笔记录');
}

function resetEntryForm() {
  elements.entryNote.value = '';
  elements.customAmount.value = '';
  elements.entryCount.value = 1;
  elements.customToggle.checked = false;
  elements.customAmountWrap.classList.add('hidden');
  elements.entryCount.disabled = false;
  updatePreview();
}

function renderEditMode() {
  const isEditing = Boolean(state.editingId);
  elements.entrySubmit.textContent = isEditing ? '保存修改' : '记录这一笔';
  elements.cancelEdit.classList.toggle('hidden', !isEditing);
  elements.deleteEntry.classList.toggle('hidden', !isEditing);
}

function getDailyQuote(date = new Date()) {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - startOfYear) / 86400000);
  return incomeQuotes[dayOfYear % incomeQuotes.length];
}

function updatePreview() {
  if (elements.customToggle.checked) {
    const amount = Number(elements.customAmount.value || 0);
    elements.formPreview.textContent = amount > 0 ? `本次将记入 ${formatCurrency(amount)}` : '填写例外金额后记录';
    return;
  }

  const count = Number(elements.entryCount.value || 0);
  const amount = count > 0 ? count * state.unitPrice : 0;
  elements.formPreview.textContent = amount > 0 ? `本次将记入 ${formatCurrency(amount)}` : '填写单数后记录';
}

function showMessage(text, isError = false) {
  elements.message.textContent = text;
  elements.message.classList.toggle('is-error', isError);
}

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

updatePreview();
render();
