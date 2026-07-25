const test = require('node:test');
const assert = require('node:assert/strict');

const { categories, operators } = require('../operator-data.js');
const { buildTree, filterTree } = require('../operator-tree.js');

test('builds interface, category, list, and operator levels', () => {
  const tree = buildTree(categories, operators);

  assert.equal(tree.label, '算子接口（aclnn）');
  assert.equal(tree.children.length, 6);
  assert.equal(tree.children[0].kind, 'category');
  assert.equal(tree.children[0].children[0].kind, 'list');
  assert.equal(tree.children[0].children[0].children[0].kind, 'operator');
});

test('search keeps ancestors of matching operators', () => {
  const result = filterTree(buildTree(categories, operators), 'aclnnAbs');

  assert.equal(result.children.length, 1);
  assert.equal(result.children[0].id, 'math');
  assert.ok(
    result.children[0].children[0].children
      .some((item) => item.apiName === 'aclnnAbs'),
  );
});

