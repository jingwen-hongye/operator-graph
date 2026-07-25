const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TABS,
  normalizeTab,
  renderInspector,
  renderEmptyInspector,
} = require('../operator-inspector.js');

const model = {
  summary: {
    name: 'aclnnMatmul',
    category: '矩阵计算类接口',
    computeType: '矩阵计算',
    description: '矩阵乘法。',
    formulaCount: 1,
    incoming: 1,
    outgoing: 2,
  },
  definition: {
    description: '矩阵乘法。',
    formulas: ['Y = XW'],
    inputs: [{ name: 'x', shape: '[M,K]', dtype: 'float16', description: '输入' }],
    outputs: [{ name: 'y', shape: '[M,N]', dtype: 'float16', description: '输出' }],
    params: [{ name: 'x', shape: '[M,K]', dtype: 'float16', description: '输入' }],
  },
  support: {
    hardware: [{
      id: 'a2',
      name: 'Atlas A2',
      status: 'full',
      dtypes: ['float16'],
      conditions: ['无特殊演示约束'],
    }],
    frameworks: ['aclnn'],
    deterministic: 'Yes',
  },
  performance: {
    rows: [{
      hardware: 'Atlas A2',
      metric: '算力',
      dtype: 'float16',
      theoretical: 280,
      measured: 210,
      utilization: 0.75,
      h100Measured: 712,
      ratio: 0.295,
      unit: 'TFLOPS',
      demo: true,
    }],
    note: '演示基准，非官方性能结论。',
  },
  precision: {
    rows: [{
      dtype: 'float16',
      error: '9.5e-4',
      cosine: '0.999930',
      grade: '优',
    }],
    note: '演示基准。',
  },
  api: {
    name: 'aclnnMatmul',
    prototype: 'aclnnStatus aclnnMatmul(...)',
    params: [{ name: 'x', dtype: 'float16', description: '输入' }],
    steps: ['创建算子执行器', '查询并申请工作区', '异步执行算子并同步结果'],
    golden: 'golden/matmul.npy',
    links: [{ label: 'CANN 学习中心', url: 'https://gitcode.com/cann/cann-learning-hub' }],
  },
};

test('renders five tabs and activates the requested tab', () => {
  assert.deepEqual(TABS.map((tab) => tab.label), [
    '算子定义',
    '支持情况',
    '性能',
    '精度',
    'API 学习',
  ]);
  assert.equal(normalizeTab('bad-value'), 'definition');

  const html = renderInspector(model, 'support');
  assert.match(html, /data-inspector-tab="definition"/);
  assert.match(html, /data-inspector-tab="support"[^>]*aria-selected="true"/);
  assert.match(html, /data-inspector-panel="support"/);
  assert.match(html, /Atlas A2/);
});

test('renders the content for every detail tab', () => {
  assert.match(renderInspector(model, 'definition'), /计算公式/);
  assert.match(renderInspector(model, 'support'), /确定性/);
  assert.match(renderInspector(model, 'performance'), /H100/);
  assert.match(renderInspector(model, 'precision'), /余弦相似度/);
  assert.match(renderInspector(model, 'api'), /Golden 数据/);
});

test('renders safe external API learning links', () => {
  const html = renderInspector(model, 'api');
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.match(html, /https:\/\/gitcode\.com\/cann\/cann-learning-hub/);
});

test('renders a useful empty inspector state', () => {
  const html = renderEmptyInspector();
  assert.match(html, /未选择算子/);
  assert.match(html, /点击图谱节点/);
});
