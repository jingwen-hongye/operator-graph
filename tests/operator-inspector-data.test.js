const test = require('node:test');
const assert = require('node:assert/strict');
const { categories, operators } = require('../operator-data.js');
const { buildInspectorModel, HARDWARE } = require('../operator-inspector-data.js');

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
