const test = require('node:test');
const assert = require('node:assert/strict');

const { computeIndicatorState } = require('../scroll-indicator.js');

test('hides when Explorer does not overflow', () => {
  assert.deepEqual(
    computeIndicatorState({
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 500,
    }),
    { visible: false, top: 8 },
  );
});

test('maps scroll progress into the available indicator track', () => {
  assert.deepEqual(
    computeIndicatorState({
      scrollTop: 0,
      scrollHeight: 1000,
      clientHeight: 500,
    }),
    { visible: true, top: 8 },
  );
  assert.deepEqual(
    computeIndicatorState({
      scrollTop: 250,
      scrollHeight: 1000,
      clientHeight: 500,
    }),
    { visible: true, top: 226 },
  );
  assert.deepEqual(
    computeIndicatorState({
      scrollTop: 500,
      scrollHeight: 1000,
      clientHeight: 500,
    }),
    { visible: true, top: 444 },
  );
});
