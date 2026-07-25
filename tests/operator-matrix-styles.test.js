const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

const requiredSelectors = [
  '.operator-center-host',
  '.operator-center-view',
  '.operator-matrix-host',
  '.operator-matrix-scroll',
  '.operator-matrix-table',
  '.operator-matrix-operator',
  '.operator-matrix-cell',
  '.operator-matrix-status',
];

test('styles the matrix and keeps overflow local', () => {
  requiredSelectors.forEach((selector) => {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  });
  assert.match(css, /\.operator-matrix-scroll\s*\{[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.operator-matrix-table\s*\{[\s\S]*min-width:\s*680px/);
  assert.match(css, /\.operator-center-view\[hidden\]\s*\{[\s\S]*display:\s*none/);
});

test('keeps headers visible and uses semantic statuses', () => {
  assert.match(css, /\.operator-matrix-table thead th\s*\{[\s\S]*position:\s*sticky/);
  assert.match(css, /\.operator-matrix-operator\s*\{[\s\S]*position:\s*sticky/);
  assert.match(css, /\.operator-matrix-status\.is-full[\s\S]*var\(--success\)/);
  assert.match(css, /\.operator-matrix-status\.is-partial[\s\S]*var\(--warning\)/);
  assert.match(css, /\.operator-matrix-status\.is-adapting[\s\S]*var\(--foreground-muted\)/);
  assert.match(css, /\.operator-matrix-table tr\.is-selected[\s\S]*var\(--state-selected\)/);
});
