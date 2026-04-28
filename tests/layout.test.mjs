import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('secondary panels live in the horizontal feature carousel', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<section class="feature-carousel"/);
  assert.match(html, /<section class="chart-panel carousel-card" aria-label="收入图表">/);
  assert.match(html, /<section class="chart-panel carousel-card" aria-label="年度收入图表">/);
  assert.match(html, /<section class="sync-panel carousel-card" aria-label="飞书同步状态">/);
  assert.match(html, /<section class="records-panel carousel-card" aria-label="进账记录">/);
});

test('record form exposes selected date controls for backfilling income', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /id="selectedDateLabel"/);
  assert.match(html, /id="todayDateButton"/);
  assert.match(html, /点日历圆点可切换日期/);
});

test('goal panel exposes a quick monthly goal editor', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /id="goalEditToggle"/);
  assert.match(html, /id="goalQuickInput"/);
  assert.match(html, /id="saveGoalQuick"/);
});
