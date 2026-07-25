const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('uses Simplified Chinese for primary interface copy', () => {
  const html = read('index.html');
  const app = read('app.js');
  const inspector = read('operator-inspector.js');

  assert.match(html, /CANN 算子图谱/);
  assert.match(html, /算子详情/);
  assert.match(html, /依赖关系/);
  assert.match(inspector, /未选择算子/);
  assert.match(app, /可见算子/);
});

test('uses Simplified Chinese for categories and descriptions', () => {
  const data = read('operator-data.js');

  assert.match(data, /数学运算类接口/);
  assert.match(data, /激活函数类接口/);
  assert.match(data, /计算输入张量中每个元素的绝对值/);
  assert.match(data, /批量矩阵乘法是基础矩阵计算的批处理变体/);
});

test('keeps technical identifiers in English', () => {
  const html = read('index.html');
  const data = read('operator-data.js');

  assert.match(data, /aclnnAdd/);
  assert.match(data, /l0op_call/);
  assert.match(html, /operator-matrix\.js/);
  assert.match(html, /data-center-view="graph"/);
});
