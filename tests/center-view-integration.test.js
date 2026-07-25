const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('loads the matrix module before app and declares two center tabs', () => {
  assert.match(html, /operator-matrix\.js[\s\S]*app\.js/);
  assert.match(html, /data-center-view="graph"/);
  assert.match(html, /data-center-view="matrix"/);
  assert.match(html, />算子图谱</);
  assert.match(html, />支持矩阵</);
  assert.match(html, /id="operator-graph-panel"[^>]*role="tabpanel"/);
  assert.match(html, /id="operator-matrix-panel"[^>]*role="tabpanel"[^>]*hidden/);
});

test('defaults to graph and switches views without resetting transform', () => {
  assert.match(app, /centerView:\s*'graph'/);
  assert.match(app, /function setCenterView\(view\)/);
  assert.match(app, /graphPanel\.hidden\s*=\s*state\.centerView\s*!==\s*'graph'/);
  assert.match(app, /matrixPanel\.hidden\s*=\s*state\.centerView\s*!==\s*'matrix'/);

  const setView = app.match(/function setCenterView\(view\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(setView);
  assert.doesNotMatch(setView[1], /state\.transform\s*=/);
  assert.doesNotMatch(setView[1], /fitGraph\(/);
});
test('matrix consumes the shared visible operator and inspector model paths', () => {
  assert.match(
    app,
    /buildMatrixModel\(visibleOperators\(\),\s*buildModelForOperator\)/,
  );
  assert.match(app, /function buildModelForOperator\(op\)/);
  assert.match(app, /bindMatrixSelection\(matrixRoot,\s*\(operatorId/);
  assert.match(app, /selectOperator\(operatorId\)/);
});

test('render updates the matrix without resetting the active center view', () => {
  assert.match(app, /function render\(\)[\s\S]*renderMatrixView\(\)/);
  assert.doesNotMatch(
    app,
    /function render\(\)[\s\S]*state\.centerView\s*=\s*'graph'/,
  );
  assert.match(app, /categoryColor:\s*categories\[op\.category\]\.color/);
});