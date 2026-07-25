const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appSource = fs.readFileSync(
  path.join(__dirname, '..', 'app.js'),
  'utf8'
);

test('mounts short scroll indicators for all three scrollable panels', () => {
  assert.match(appSource, /ScrollIndicator\.mount\(explorerScroll\)/);
  assert.match(appSource, /ScrollIndicator\.mount\(inspectorScroll\)/);
  assert.match(appSource, /ScrollIndicator\.mount\(edgeTableScroll\)/);
});
