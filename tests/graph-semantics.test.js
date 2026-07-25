const test = require('node:test');
const assert = require('node:assert/strict');

const { semanticPalette } = require('../operator-data.js');

test('uses the PTO model-graphviz semantic category palette', () => {
  assert.deepEqual(semanticPalette, {
    math: '#14B8A6',
    activation: '#8B5CF6',
    norm: '#0EA5E9',
    attention: '#3B82F6',
    matmul: '#4F46E5',
    quant: '#F59E0B',
  });
});
