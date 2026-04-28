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
