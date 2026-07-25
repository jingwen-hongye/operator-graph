const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('loads and connects the inspector modules', () => {
  assert.match(
    html,
    /operator-inspector-data\.js[\s\S]*operator-inspector\.js[\s\S]*app\.js/,
  );
  assert.match(app, /inspectorTab:\s*'definition'/);
  assert.match(app, /OperatorInspectorData\.buildInspectorModel/);
  assert.match(app, /OperatorInspectorView\.renderInspector/);
  assert.match(app, /OperatorInspectorView\.renderEmptyInspector/);
  assert.match(app, /OperatorInspectorView\.bindInspectorTabs/);
});

test('preserves the active tab across operator selection and resets scroll on tab change', () => {
  assert.doesNotMatch(app, /inspectorTab\s*=\s*'definition'/);
  assert.match(app, /state\.inspectorTab\s*=\s*tab/);
  assert.match(app, /inspector\.scrollTop\s*=\s*0/);
  assert.match(app, /inspectorScrollIndicator\.update/);
});
