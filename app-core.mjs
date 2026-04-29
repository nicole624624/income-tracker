export const DEFAULT_UNIT_PRICE = 199;
export const DEFAULT_MONTH_GOAL = 10000;

export function todayISO(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function currentMonthKey(now = new Date()) {
  return todayISO(now).slice(0, 7);
}

export function createSaleEntry({ date, count = 1, unitPrice = DEFAULT_UNIT_PRICE, note = '' }) {
  const safeDate = normalizeDate(date);
  const safeCount = normalizePositiveNumber(count, '成交单数');
  const safeUnitPrice = normalizePositiveNumber(unitPrice, '单价');

  return {
    id: createId(),
    date: safeDate,
    amount: roundMoney(safeCount * safeUnitPrice),
    count: safeCount,
    unitPrice: safeUnitPrice,
    note: String(note || '').trim(),
    isCustom: false,
    createdAt: new Date().toISOString(),
  };
}

export function createCustomEntry({ date, amount, note = '' }) {
  const safeDate = normalizeDate(date);
  const safeAmount = normalizePositiveNumber(amount, '金额');

  return {
    id: createId(),
    date: safeDate,
    amount: roundMoney(safeAmount),
    count: 0,
    unitPrice: 0,
    note: String(note || '').trim(),
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
}

export function updateEntry(originalEntry, changes) {
  if (!originalEntry?.id) {
    throw new Error('找不到要修改的记录');
  }

  const nextEntry = changes.isCustom
    ? createCustomEntry({
        date: changes.date ?? originalEntry.date,
        amount: changes.amount,
        note: changes.note,
      })
    : createSaleEntry({
        date: changes.date ?? originalEntry.date,
        count: changes.count,
        unitPrice: changes.unitPrice ?? originalEntry.unitPrice ?? DEFAULT_UNIT_PRICE,
        note: changes.note,
      });

  return {
    ...nextEntry,
    id: originalEntry.id,
    createdAt: originalEntry.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function getMonthSummary(entries, monthKey) {
  const monthEntries = filterMonth(entries, monthKey);
  return monthEntries.reduce(
    (summary, entry) => ({
      totalIncome: roundMoney(summary.totalIncome + Number(entry.amount || 0)),
      totalSales: summary.totalSales + Number(entry.count || 0),
      entryCount: summary.entryCount + 1,
    }),
    { totalIncome: 0, totalSales: 0, entryCount: 0 },
  );
}

export function getDailyGroups(entries, monthKey) {
  const groups = new Map();

  for (const entry of filterMonth(entries, monthKey)) {
    if (!groups.has(entry.date)) {
      groups.set(entry.date, {
        date: entry.date,
        totalIncome: 0,
        totalSales: 0,
        entries: [],
      });
    }

    const group = groups.get(entry.date);
    group.totalIncome = roundMoney(group.totalIncome + Number(entry.amount || 0));
    group.totalSales += Number(entry.count || 0);
    group.entries.push(entry);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      entries: group.entries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getDailyChartData(entries, monthKey, today = todayISO()) {
  const [year, month] = monthKey.split('-').map(Number);
  const dayCount = new Date(year, month, 0).getDate();
  const totals = new Map();

  for (const entry of filterMonth(entries, monthKey)) {
    const current = totals.get(entry.date) || { totalIncome: 0, totalSales: 0, entryCount: 0 };
    totals.set(entry.date, {
      totalIncome: roundMoney(current.totalIncome + Number(entry.amount || 0)),
      totalSales: current.totalSales + Number(entry.count || 0),
      entryCount: current.entryCount + 1,
    });
  }

  const items = Array.from({ length: dayCount }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    const key = `${monthKey}-${day}`;
    const total = totals.get(key) || { totalIncome: 0, totalSales: 0, entryCount: 0 };
    return {
      key,
      label: String(index + 1),
      ...total,
      percent: 0,
      isToday: key === today,
    };
  });

  return withRelativePercents(items);
}

export function getMonthlyChartData(entries, yearKey) {
  const totals = new Map();

  for (const entry of entries.filter((entry) => String(entry.date || '').startsWith(`${yearKey}-`))) {
    const key = String(entry.date).slice(0, 7);
    const current = totals.get(key) || { totalIncome: 0, totalSales: 0, entryCount: 0 };
    totals.set(key, {
      totalIncome: roundMoney(current.totalIncome + Number(entry.amount || 0)),
      totalSales: current.totalSales + Number(entry.count || 0),
      entryCount: current.entryCount + 1,
    });
  }

  const items = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    const key = `${yearKey}-${month}`;
    const total = totals.get(key) || { totalIncome: 0, totalSales: 0, entryCount: 0 };
    return {
      key,
      label: `${index + 1}月`,
      ...total,
      percent: 0,
    };
  });

  return withRelativePercents(items);
}

export function getGoalProgress(totalIncome, goal) {
  const safeGoal = Number(goal) > 0 ? Number(goal) : DEFAULT_MONTH_GOAL;
  const safeIncome = Math.max(0, Number(totalIncome) || 0);
  const percent = roundMoney((safeIncome / safeGoal) * 100);

  return {
    percent,
    visualPercent: Math.min(100, percent),
    remaining: roundMoney(Math.max(0, safeGoal - safeIncome)),
    reached: safeIncome >= safeGoal,
  };
}

export function prepareFeishuRecord(entry) {
  return {
    fields: {
      日期: entry.date,
      金额: Number(entry.amount || 0),
      单数: Number(entry.count || 0),
      类型: entry.isCustom ? '例外金额' : '默认成交',
      备注: String(entry.note || ''),
    },
  };
}

export function createSyncRequest(queueItem) {
  return {
    source: 'income-tracker',
    event: 'income.created',
    entryId: queueItem.id,
    queuedAt: queueItem.queuedAt,
    record: queueItem.payload,
  };
}

export function formatCurrency(amount) {
  const number = roundMoney(Number(amount) || 0);
  const hasDecimals = !Number.isInteger(number);
  return `¥${number.toLocaleString('zh-CN', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function filterMonth(entries, monthKey) {
  return [...entries].filter((entry) => String(entry.date || '').startsWith(monthKey));
}

function withRelativePercents(items) {
  const maxIncome = Math.max(...items.map((item) => item.totalIncome), 0);
  return items.map((item) => ({
    ...item,
    percent: maxIncome > 0 ? roundMoney((item.totalIncome / maxIncome) * 100) : 0,
    fillPercent: maxIncome > 0 ? roundMoney((item.totalIncome / maxIncome) * 100) : 0,
  }));
}

function normalizeDate(date) {
  const value = String(date || todayISO()).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('日期格式需要是 YYYY-MM-DD');
  }
  return value;
}

function normalizePositiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label}需要大于 0`);
  }
  return number;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
