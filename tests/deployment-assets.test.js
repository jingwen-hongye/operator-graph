const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

test('packages every PTO dependency inside the deployable repository', () => {
  assert.doesNotMatch(html, /\.\.\/pto-design-system\//);

  const references = [...html.matchAll(
    /(?:href|src)="(\.\/pto-design-system\/[^"]+)"/g
  )].map((match) => match[1]);

  assert.equal(references.length, 8);
  references.forEach((reference) => {
    assert.equal(
      fs.existsSync(path.resolve(projectRoot, reference)),
      true,
      `missing deployment asset: ${reference}`
    );
  });
});
