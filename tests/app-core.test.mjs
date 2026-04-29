import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSyncRequest,
  createCustomEntry,
  createSaleEntry,
  formatCurrency,
  getDailyChartData,
  getDailyGroups,
  getGoalProgress,
  getMonthlyChartData,
  getMonthSummary,
  prepareFeishuRecord,
  updateEntry,
} from '../app-core.mjs';

test('creates a normal sale entry from count and unit price', () => {
  const entry = createSaleEntry({
    date: '2026-04-28',
    count: 2,
    unitPrice: 199,
    note: 'two deals',
  });

  assert.equal(entry.date, '2026-04-28');
  assert.equal(entry.count, 2);
  assert.equal(entry.amount, 398);
  assert.equal(entry.isCustom, false);
  assert.equal(entry.note, 'two deals');
});

test('creates a custom exception entry with its exact amount', () => {
  const entry = createCustomEntry({
    date: '2026-04-28',
    amount: 299,
    note: 'special price',
  });

  assert.equal(entry.amount, 299);
  assert.equal(entry.count, 0);
  assert.equal(entry.isCustom, true);
  assert.equal(entry.note, 'special price');
});

test('updates an existing entry while keeping its identity', () => {
  const original = createSaleEntry({
    date: '2026-04-09',
    count: 1,
    unitPrice: 199,
    note: 'wrong amount',
  });

  const updated = updateEntry(original, {
    date: '2026-04-09',
    amount: 299,
    note: 'fixed amount',
    isCustom: true,
  });

  assert.equal(updated.id, original.id);
  assert.equal(updated.createdAt, original.createdAt);
  assert.equal(updated.amount, 299);
  assert.equal(updated.count, 0);
  assert.equal(updated.unitPrice, 0);
  assert.equal(updated.note, 'fixed amount');
  assert.equal(updated.isCustom, true);
  assert.ok(updated.updatedAt);
});

test('summarizes only entries in the selected month', () => {
  const entries = [
    createSaleEntry({ date: '2026-04-01', count: 1, unitPrice: 199 }),
    createSaleEntry({ date: '2026-04-02', count: 3, unitPrice: 199 }),
    createCustomEntry({ date: '2026-04-02', amount: 50, note: 'bonus' }),
    createSaleEntry({ date: '2026-05-01', count: 10, unitPrice: 199 }),
  ];

  const summary = getMonthSummary(entries, '2026-04');

  assert.equal(summary.totalIncome, 846);
  assert.equal(summary.totalSales, 4);
  assert.equal(summary.entryCount, 3);
});

test('groups entries by day with newest day first', () => {
  const entries = [
    createSaleEntry({ date: '2026-04-01', count: 1, unitPrice: 199 }),
    createSaleEntry({ date: '2026-04-02', count: 2, unitPrice: 199 }),
    createCustomEntry({ date: '2026-04-02', amount: 50 }),
  ];

  const groups = getDailyGroups(entries, '2026-04');

  assert.equal(groups[0].date, '2026-04-02');
  assert.equal(groups[0].totalIncome, 448);
  assert.equal(groups[0].entries.length, 2);
  assert.equal(groups[1].date, '2026-04-01');
  assert.equal(groups[1].totalIncome, 199);
});

test('calculates remaining amount and visual percent for the goal', () => {
  assert.deepEqual(getGoalProgress(500, 1000), {
    percent: 50,
    visualPercent: 50,
    remaining: 500,
    reached: false,
  });

  assert.deepEqual(getGoalProgress(1200, 1000), {
    percent: 120,
    visualPercent: 100,
    remaining: 0,
    reached: true,
  });
});

test('formats RMB currency without decimal noise', () => {
  assert.equal(formatCurrency(398), '¥398');
  assert.equal(formatCurrency(398.5), '¥398.50');
});

test('builds daily chart data for every day in a month', () => {
  const entries = [
    createSaleEntry({ date: '2026-04-01', count: 1, unitPrice: 199 }),
    createSaleEntry({ date: '2026-04-02', count: 2, unitPrice: 199 }),
    createCustomEntry({ date: '2026-04-02', amount: 50 }),
    createSaleEntry({ date: '2026-05-01', count: 9, unitPrice: 199 }),
  ];

  const chart = getDailyChartData(entries, '2026-04', '2026-04-02');

  assert.equal(chart.length, 30);
  assert.deepEqual(chart[0], {
    key: '2026-04-01',
    label: '1',
    totalIncome: 199,
    totalSales: 1,
    entryCount: 1,
    percent: 44.42,
    isToday: false,
    fillPercent: 44.42,
  });
  assert.equal(chart[1].totalIncome, 448);
  assert.equal(chart[1].totalSales, 2);
  assert.equal(chart[1].entryCount, 2);
  assert.equal(chart[1].percent, 100);
  assert.equal(chart[1].fillPercent, 100);
  assert.equal(chart[1].isToday, true);
  assert.equal(chart[29].totalIncome, 0);
  assert.equal(chart[29].fillPercent, 0);
});

test('builds monthly chart data for all twelve months in a year', () => {
  const entries = [
    createSaleEntry({ date: '2026-01-15', count: 1, unitPrice: 199 }),
    createSaleEntry({ date: '2026-04-01', count: 3, unitPrice: 199 }),
    createCustomEntry({ date: '2026-04-02', amount: 50 }),
    createSaleEntry({ date: '2025-04-01', count: 20, unitPrice: 199 }),
  ];

  const chart = getMonthlyChartData(entries, '2026');

  assert.equal(chart.length, 12);
  assert.deepEqual(chart[0], {
    key: '2026-01',
    label: '1月',
    totalIncome: 199,
    totalSales: 1,
    entryCount: 1,
    percent: 30.76,
    fillPercent: 30.76,
  });
  assert.equal(chart[3].totalIncome, 647);
  assert.equal(chart[3].totalSales, 3);
  assert.equal(chart[3].entryCount, 2);
  assert.equal(chart[3].percent, 100);
  assert.equal(chart[3].fillPercent, 100);
  assert.equal(chart[11].totalIncome, 0);
  assert.equal(chart[11].fillPercent, 0);
});

test('prepares an entry payload for Feishu table fields', () => {
  const entry = createSaleEntry({
    date: '2026-04-28',
    count: 2,
    unitPrice: 199,
    note: '客户 A',
  });

  const payload = prepareFeishuRecord(entry);

  assert.deepEqual(payload, {
    fields: {
      日期: '2026-04-28',
      金额: 398,
      单数: 2,
      类型: '默认成交',
      备注: '客户 A',
    },
  });
});

test('wraps queued records for a webhook sync endpoint', () => {
  const payload = { fields: { 日期: '2026-04-28', 金额: 199 } };
  const request = createSyncRequest({
    id: 'entry-1',
    payload,
    queuedAt: '2026-04-28T10:00:00.000Z',
  });

  assert.deepEqual(request, {
    source: 'income-tracker',
    event: 'income.created',
    entryId: 'entry-1',
    queuedAt: '2026-04-28T10:00:00.000Z',
    record: payload,
  });
});
