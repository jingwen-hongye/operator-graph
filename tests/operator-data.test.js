const test = require('node:test');
const assert = require('node:assert/strict');

const { categories, operators } = require('../operator-data.js');

test('provides representative operators across six categories', () => {
  assert.deepEqual(Object.keys(categories), [
    'math',
    'activation',
    'norm',
    'attention',
    'matmul',
    'quant',
  ]);
  assert.ok(operators.length >= 25 && operators.length <= 30);

  Object.keys(categories).forEach((category) => {
    const members = operators.filter((operator) => operator.category === category);
    assert.ok(members.length >= 3 && members.length <= 5);
    assert.ok(members.every((operator) => operator.apiName.startsWith('aclnn')));
  });
});
