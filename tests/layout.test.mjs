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
  assert.match(html, /id="cancelEdit"/);
  assert.match(html, /id="deleteEntry"/);
  assert.match(html, /点日历圆点可切换日期/);
});

test('monthly records expose an edit action for correcting mistakes', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(app, /data-edit-id/);
  assert.match(app, /修改/);
  assert.match(app, /startEditingEntry/);
  assert.match(app, /deleteEditingEntry/);
  assert.match(app, /确定删除这笔记录吗/);
});

test('goal panel keeps monthly goal editing out of the homepage card', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /id="goalEditToggle"/);
  assert.doesNotMatch(html, /id="goalQuickInput"/);
  assert.doesNotMatch(html, /id="saveGoalQuick"/);
  assert.match(html, /id="goalInput"/);
});

test('homepage quote reflects income as trust and momentum', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(html, /又一份信任，到账了。/);
  assert.match(app, /incomeQuotes\s*=\s*\[/);
  assert.match(app, /你值得。这一切都是你应得的。/);
  assert.doesNotMatch(html, /今日语录/);
  assert.doesNotMatch(app, /今日语录/);
});

test('homepage has a top belief banner for the health service mission', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /class="belief-banner"/);
  assert.match(html, /你记下的每一笔，都是一个真实的人，把改善健康的希望托付给了你/);
});

test('quick goal editor styles are removed with the homepage editor', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.doesNotMatch(css, /\.goal-editor\b/);
});

test('settings panel opens near the top of the page', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.ok(html.indexOf('id="settingsPanel"') < html.indexOf('class="goal-panel"'));
});
