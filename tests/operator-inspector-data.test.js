const test = require('node:test');
const assert = require('node:assert/strict');
const { categories, operators } = require('../operator-data.js');
const { buildInspectorModel, HARDWARE } = require('../operator-inspector-data.js');

function makeInput(overrides = {}) {
  const op = {
    id: 'sample',
    apiName: 'aclnnSample',
    category: 'math',
    description: '示例算子。',
    formulas: ['y = f(x)'],
    params: [['x', 'float16', '输入张量']],
    ...overrides.op,
  };
  const profile = {
    computeType: '数学运算',
    platforms: ['Atlas A2'],
    frameworks: ['aclnn'],
    api: [op.apiName],
    prototype: `aclnnStatus ${op.apiName}(aclnnTensor* x, aclnnTensor* y)`,
    golden: `golden/${op.id}.npy`,
    deterministic: 'Yes',
    dtypes: ['float16', 'float32'],
    ...overrides.profile,
  };

  return {
    op,
    category: { id: 'math', label: '数学运算类接口' },
    profile,
    incoming: 1,
    outgoing: 2,
  };
}

test('builds all five inspector data groups for every operator', () => {
  assert.deepEqual(HARDWARE.map((item) => item.name), [
    'Atlas A2',
    'Ascend A3',
    'Ascend A5',
  ]);

  operators.forEach((op) => {
    const model = buildInspectorModel({
      op,
      category: categories[op.category],
      profile: {
        computeType: categories[op.category].label,
        platforms: ['Atlas A2'],
        frameworks: ['aclnn'],
        api: [op.apiName],
        prototype: `aclnnStatus ${op.apiName}(aclnnTensor* x, aclnnTensor* y)`,
        golden: `golden/${op.id}.npy`,
        deterministic: 'Yes',
        dtypes: ['float16', 'float32'],
      },
      incoming: 1,
      outgoing: 2,
    });

    assert.equal(model.summary.name, op.apiName);
    assert.ok(model.definition.formulas.length >= 1);
    assert.equal(model.support.hardware.length, 3);
    assert.equal(model.performance.rows.length, 3);
    assert.ok(model.precision.rows.length >= 1);
    assert.equal(model.api.name, op.apiName);
  });
});

test('classifies explicit outputs and adds an out fallback when absent', () => {
  const explicit = buildInspectorModel(makeInput({
    op: {
      params: [
        ['x', 'float16', '输入张量'],
        ['output', 'float16', '输出张量'],
      ],
    },
  }));
  assert.deepEqual(explicit.definition.inputs.map((item) => item.name), ['x']);
  assert.deepEqual(explicit.definition.outputs.map((item) => item.name), ['output']);

  const fallback = buildInspectorModel(makeInput());
  assert.deepEqual(fallback.definition.outputs, [{
    name: 'out',
    shape: '—',
    dtype: 'float16 / float32',
    description: '输出张量',
  }]);
});

test('honors A2 platform support and keeps generated hardware states stable', () => {
  const supported = buildInspectorModel(makeInput());
  const unsupported = buildInspectorModel(makeInput({
    profile: { platforms: ['Ascend 310P'] },
  }));
  const repeated = buildInspectorModel(makeInput());

  assert.equal(supported.support.hardware[0].status, 'full');
  assert.equal(unsupported.support.hardware[0].status, 'partial');
  assert.deepEqual(
    supported.support.hardware.slice(1).map((item) => item.status),
    repeated.support.hardware.slice(1).map((item) => item.status),
  );
  assert.ok(supported.support.hardware.every((item) => (
    ['full', 'partial', 'adapting'].includes(item.status)
  )));
});

test('provides every performance field and marks rows as demo data', () => {
  const model = buildInspectorModel(makeInput());
  const requiredFields = [
    'metric',
    'dtype',
    'theoretical',
    'measured',
    'utilization',
    'h100Measured',
    'ratio',
  ];

  model.performance.rows.forEach((row) => {
    requiredFields.forEach((field) => assert.ok(Object.hasOwn(row, field), field));
    assert.equal(row.demo, true);
    assert.ok(Number.isFinite(row.measured));
    assert.ok(Number.isFinite(row.ratio));
  });
  assert.match(model.performance.note, /演示基准/);
});

test('grades known and fallback precision baselines', () => {
  const model = buildInspectorModel(makeInput({
    profile: { dtypes: ['float32', 'float16', 'int8', 'custom'] },
  }));
  const grades = Object.fromEntries(
    model.precision.rows.map((row) => [row.dtype, row.grade]),
  );

  assert.deepEqual(grades, {
    float32: '优',
    float16: '优',
    int8: '关注',
    custom: '良',
  });
  assert.equal(model.precision.rows.at(-1).error, '—');
});

test('includes the three API learning steps and official learning links', () => {
  const model = buildInspectorModel(makeInput());

  assert.equal(model.api.steps.length, 3);
  assert.deepEqual(model.api.links.map((link) => link.url), [
    'https://gitcode.com/cann/ops-nn',
    'https://gitcode.com/cann/cann-learning-hub',
  ]);
});