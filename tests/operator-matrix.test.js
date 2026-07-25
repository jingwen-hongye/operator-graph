const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../operator-data.js');
const inspectorData = require('../operator-inspector-data.js');
const matrix = require('../operator-matrix.js');

function profileFor(op) {
  return {
    computeType: '示例算子',
    platforms: ['Atlas A2'],
    frameworks: ['aclnn'],
    api: [op.apiName],
    prototype: `aclnnStatus ${op.apiName}(...)`,
    golden: `golden/${op.id}.npy`,
    deterministic: 'Yes',
    dtypes: ['float16', 'float32'],
  };
}

function inspectorFor(op) {
  return inspectorData.buildInspectorModel({
    op,
    category: data.categories[op.category],
    profile: profileFor(op),
    incoming: 0,
    outgoing: 0,
  });
}

test('builds three hardware cells from inspector support data', () => {
  const model = matrix.buildMatrixModel(data.operators.slice(0, 2), inspectorFor);

  assert.deepEqual(model.hardware.map((item) => item.name), [
    'Atlas A2',
    'Ascend A3',
    'Ascend A5',
  ]);
  assert.equal(model.rows.length, 2);
  assert.equal(model.rows[0].hardware.length, 3);
  assert.deepEqual(
    model.rows[0].hardware,
    inspectorFor(data.operators[0]).support.hardware,
  );
});

test('renders hardware headers, statuses, selection, and escaped labels', () => {
  const model = {
    hardware: [
      { id: 'a2', name: 'Atlas A2' },
      { id: 'a3', name: 'Ascend A3' },
      { id: 'a5', name: 'Ascend A5' },
    ],
    rows: [{
      id: 'unsafe',
      apiName: '<unsafe>',
      category: '矩阵计算类接口',
      categoryColor: '#4F46E5',
      hardware: [
        { id: 'a2', name: 'Atlas A2', status: 'full', dtypes: ['float16'] },
        { id: 'a3', name: 'Ascend A3', status: 'partial', dtypes: ['float16'] },
        { id: 'a5', name: 'Ascend A5', status: 'adapting', dtypes: ['float16'] },
      ],
    }],
  };

  const html = matrix.renderMatrix(model, 'unsafe');

  assert.match(html, /Atlas A2/);
  assert.match(html, /Ascend A3/);
  assert.match(html, /Ascend A5/);
  assert.match(html, /●<\/span>完全支持/);
  assert.match(html, /◐<\/span>部分支持/);
  assert.match(html, /–<\/span>适配中/);
  assert.match(html, /<tr class="is-selected">/);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.doesNotMatch(html, /<unsafe>/);
});

test('renders a useful empty state', () => {
  const html = matrix.renderMatrix({ hardware: [], rows: [] });
  assert.match(html, /没有匹配的算子/);
  assert.match(html, /调整左侧分类或搜索条件/);
});

test('delegates operator and hardware selection', () => {
  let clickHandler;
  const calls = [];
  const target = {
    dataset: {
      matrixOperator: 'matmul',
      matrixHardware: 'a3',
    },
  };
  const root = {
    addEventListener(type, handler) {
      if (type === 'click') clickHandler = handler;
    },
    removeEventListener() {},
    contains(node) {
      return node === target;
    },
  };
  target.closest = () => target;

  matrix.bindMatrixSelection(root, (operatorId, hardwareId) => {
    calls.push([operatorId, hardwareId]);
  });
  clickHandler({ target });

  assert.deepEqual(calls, [['matmul', 'a3']]);
});
