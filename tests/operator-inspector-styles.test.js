const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

const requiredSelectors = [
  '.operator-inspector-summary',
  '.operator-inspector-tabs',
  '.operator-inspector-panel',
  '.operator-detail-table',
  '.operator-support-row',
  '.operator-status-glyph',
  '.operator-learning-steps',
  '.operator-api-links',
  '.operator-demo-note',
];

test('styles every operator inspector surface', () => {
  requiredSelectors.forEach((selector) => assert.match(css, new RegExp(selector.replace('.', '\\.'))));
});

test('keeps tabs compact and tables locally scrollable', () => {
  assert.match(css, /\.operator-inspector-tabs\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.operator-table-scroll\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.operator-detail-table\s*\{[\s\S]*min-width:/);
});

test('uses distinct PTO status colors', () => {
  assert.match(css, /\.operator-support-status\.is-full[\s\S]*var\(--success\)/);
  assert.match(css, /\.operator-support-status\.is-partial[\s\S]*var\(--warning\)/);
  assert.match(css, /\.operator-support-status\.is-adapting[\s\S]*var\(--foreground-muted\)/);
});