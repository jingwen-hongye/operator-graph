# Operator Tree and Graph Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat category filter with a representative expandable CANN operator hierarchy and restyle the circular graph nodes with PTO model-graphviz semantic colors.

**Architecture:** Move representative operator/category data into a browser-and-Node compatible data module, and put hierarchy construction/filtering in a small pure module that can be tested without a browser. Keep SVG interaction and inspector rendering in `app.js`, consuming the shared modules so the tree, graph, and inspector use one source of truth.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, SVG, Node.js built-in test runner, PTO design-system CSS tokens and model-graphviz semantic palette.

## Global Constraints

- Keep graph nodes circular.
- Use approximately 25 to 30 representative operators, with three to five examples per category.
- Initial categories are Math, Activation, Normalization, Attention, Matrix, and Quantization.
- Node fill is the only hard-coded data-visualization color exception; all other UI styling remains token-derived.
- Selecting a category filters the graph; selecting a leaf synchronizes the graph and inspector.
- Search preserves ancestor context for matching leaves.
- The demo remains dependency-free and runs from a static HTTP server.
- This directory is not a Git repository, so commit steps are documented but cannot be executed unless it is later initialized or moved into a repository.

---

### Task 1: Representative Operator Data

**Files:**
- Create: `operator-graph-pto-demo/operator-data.js`
- Create: `operator-graph-pto-demo/tests/operator-data.test.js`
- Modify: `operator-graph-pto-demo/index.html`

**Interfaces:**
- Produces: `OperatorDemoData.categories: Record<string, Category>`
- Produces: `OperatorDemoData.operators: Operator[]`
- Produces: `OperatorDemoData.links: Link[]`
- `Category` fields: `id`, `label`, `listLabel`, `color`, `interfaceFamily`
- `Operator` fields retain the existing inspector fields and add `apiName`

- [ ] **Step 1: Write the failing data-contract test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { categories, operators } = require('../operator-data.js');

test('provides representative operators across six categories', () => {
  assert.deepEqual(Object.keys(categories), [
    'math', 'activation', 'norm', 'attention', 'matmul', 'quant',
  ]);
  assert.ok(operators.length >= 25 && operators.length <= 30);
  Object.keys(categories).forEach((category) => {
    const members = operators.filter((operator) => operator.category === category);
    assert.ok(members.length >= 3 && members.length <= 5);
    assert.ok(members.every((operator) => operator.apiName.startsWith('aclnn')));
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test tests/operator-data.test.js`

Expected: FAIL because `operator-data.js` does not exist.

- [ ] **Step 3: Create the shared data module**

Use a UMD-style wrapper so the same records are available as `window.OperatorDemoData` in the browser and `module.exports` in Node:

```js
(function exposeOperatorData(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  root.OperatorDemoData = data;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildData() {
  const categories = {
    math: { id: 'math', label: 'Math 类接口', listLabel: 'Math 算子列表', color: '#14B8A6', interfaceFamily: 'aclnn' },
    activation: { id: 'activation', label: 'Activation 类接口', listLabel: 'Activation 算子列表', color: '#8B5CF6', interfaceFamily: 'aclnn' },
    norm: { id: 'norm', label: 'Normalization 类接口', listLabel: 'Normalization 算子列表', color: '#0EA5E9', interfaceFamily: 'aclnn' },
    attention: { id: 'attention', label: 'Attention 类接口', listLabel: 'Attention 算子列表', color: '#3B82F6', interfaceFamily: 'aclnn' },
    matmul: { id: 'matmul', label: 'Matrix 类接口', listLabel: 'Matrix 算子列表', color: '#4F46E5', interfaceFamily: 'aclnn' },
    quant: { id: 'quant', label: 'Quantization 类接口', listLabel: 'Quantization 算子列表', color: '#F59E0B', interfaceFamily: 'aclnn' },
  };

  const operators = [
    // Add 3-5 complete existing-style records per category, 25-30 total.
  ];
  const links = [
    // Keep meaningful cross-category and within-category sample relationships.
  ];
  return { categories, operators, links };
}));
```

Move existing profiles into each relevant operator record or retain the fallback profile in `app.js`. Add representative operators including `aclnnAbs`, `aclnnAdd`, `aclnnMul`, `aclnnRelu`, `aclnnGelu`, `aclnnSoftmax`, `aclnnLayerNorm`, `aclnnRmsNorm`, `aclnnFlashAttentionScore`, `aclnnPromptFlashAttention`, `aclnnMatmul`, `aclnnBatchMatMul`, `aclnnQuantMatmul`, and `aclnnDequant`.

- [ ] **Step 4: Load the data before the application**

Add before `app.js` in `index.html`:

```html
<script src="./operator-data.js"></script>
<script src="./operator-tree.js"></script>
<script src="./app.js"></script>
```

- [ ] **Step 5: Run the test and confirm GREEN**

Run: `node --test tests/operator-data.test.js`

Expected: PASS with one passing test.

- [ ] **Step 6: Commit when repository support exists**

```bash
git add operator-data.js tests/operator-data.test.js index.html
git commit -m "feat: add representative operator catalog"
```

### Task 2: Expandable Operator Hierarchy

**Files:**
- Create: `operator-graph-pto-demo/operator-tree.js`
- Create: `operator-graph-pto-demo/tests/operator-tree.test.js`
- Modify: `operator-graph-pto-demo/index.html`
- Modify: `operator-graph-pto-demo/app.js`
- Modify: `operator-graph-pto-demo/styles.css`

**Interfaces:**
- Consumes: `categories` and `operators` from Task 1
- Produces: `OperatorTree.buildTree(categories, operators): TreeRoot`
- Produces: `OperatorTree.filterTree(tree, query): TreeRoot`
- Produces: browser tree rows with `data-tree-category` and `data-tree-operator`

- [ ] **Step 1: Write failing hierarchy and search tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { categories, operators } = require('../operator-data.js');
const { buildTree, filterTree } = require('../operator-tree.js');

test('builds interface, category, list, and operator levels', () => {
  const tree = buildTree(categories, operators);
  assert.equal(tree.label, '算子接口（aclnn）');
  assert.equal(tree.children.length, 6);
  assert.equal(tree.children[0].children[0].kind, 'list');
  assert.equal(tree.children[0].children[0].children[0].kind, 'operator');
});

test('search keeps ancestors of matching operators', () => {
  const result = filterTree(buildTree(categories, operators), 'aclnnAdd');
  assert.equal(result.children.length, 1);
  assert.equal(result.children[0].id, 'math');
  assert.ok(result.children[0].children[0].children.some((item) => item.apiName === 'aclnnAdd'));
});
```

- [ ] **Step 2: Run the tests and confirm RED**

Run: `node --test tests/operator-tree.test.js`

Expected: FAIL because `operator-tree.js` does not exist.

- [ ] **Step 3: Implement pure hierarchy helpers**

```js
function buildTree(categories, operators) {
  return {
    id: 'aclnn',
    kind: 'family',
    label: '算子接口（aclnn）',
    children: Object.values(categories).map((category) => ({
      ...category,
      kind: 'category',
      children: [{
        id: `${category.id}-list`,
        kind: 'list',
        label: category.listLabel,
        children: operators
          .filter((operator) => operator.category === category.id)
          .map((operator) => ({ ...operator, kind: 'operator' })),
      }],
    })),
  };
}

function filterTree(tree, query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return tree;
  return {
    ...tree,
    children: tree.children
      .map((category) => ({
        ...category,
        children: category.children.map((list) => ({
          ...list,
          children: list.children.filter((operator) =>
            [operator.apiName, operator.id, operator.description]
              .some((value) => value.toLowerCase().includes(normalized))),
        })).filter((list) => list.children.length),
      }))
      .filter((category) => category.children.length),
  };
}
```

Export through the same browser-and-Node wrapper used by `operator-data.js`.

- [ ] **Step 4: Replace flat-filter markup and rendering**

Change the Explorer section title to `算子分类` and render a nested tree into `#category-list`. Track:

```js
state.expanded = new Set(['aclnn', 'math', 'math-list']);
state.activeCategory = null;
```

Render disclosure buttons for family/category/list rows and leaf buttons for operators. A category click sets `activeCategory`; a leaf click calls `selectOperator(id)`. When a graph node is selected, add its category and list IDs to `state.expanded` and scroll the leaf into view.

- [ ] **Step 5: Add token-derived tree styling**

Add stable row heights, indentation, disclosure icon rotation, guide lines, hover state, and selected leaf styling. Use `var(--state-hover)`, `var(--state-selected)`, `var(--foreground)`, `var(--foreground-secondary)`, and `var(--border-subtle)`. Keep card radius at `var(--radius-md)` or less.

- [ ] **Step 6: Run hierarchy tests and confirm GREEN**

Run: `node --test tests/operator-tree.test.js`

Expected: PASS with two passing tests.

- [ ] **Step 7: Commit when repository support exists**

```bash
git add operator-tree.js tests/operator-tree.test.js index.html app.js styles.css
git commit -m "feat: add expandable operator hierarchy"
```

### Task 3: PTO Semantic Circular Graph

**Files:**
- Create: `operator-graph-pto-demo/tests/graph-semantics.test.js`
- Modify: `operator-graph-pto-demo/app.js`
- Modify: `operator-graph-pto-demo/styles.css`

**Interfaces:**
- Consumes: category `color` fields from Task 1
- Produces: circular SVG nodes colored by semantic operator role
- Produces: neutral edges with selected relationship emphasis

- [ ] **Step 1: Write the failing palette test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { categories } = require('../operator-data.js');

test('uses the PTO model-graphviz semantic category palette', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(categories).map(([id, item]) => [id, item.color])),
    {
      math: '#14B8A6',
      activation: '#8B5CF6',
      norm: '#0EA5E9',
      attention: '#3B82F6',
      matmul: '#4F46E5',
      quant: '#F59E0B',
    },
  );
});
```

- [ ] **Step 2: Run the test and confirm RED if Task 1 colors differ**

Run: `node --test tests/graph-semantics.test.js`

Expected: FAIL until the exact semantic palette is present.

- [ ] **Step 3: Update graph rendering**

Keep `<circle>` nodes. Set `--node-color` from the category record. Give nodes a stable 38px base radius and 44px radius only for long API labels. Display a shortened operator name inside the circle and the full `apiName` in the tooltip.

Replace relation-type edge colors with a neutral token-derived stroke. Add `is-related` to edges connected to the selected node and keep `is-muted` for unrelated edges.

- [ ] **Step 4: Update graph CSS**

```css
.graph-link {
  stroke: var(--foreground-muted);
  stroke-width: 1.5;
  stroke-opacity: 0.42;
}

.graph-link.is-related {
  stroke: var(--foreground);
  stroke-width: 2;
  stroke-opacity: 0.78;
}

.graph-node circle {
  fill: color-mix(in srgb, var(--node-color) 78%, var(--surface-2));
  stroke: color-mix(in srgb, var(--node-color) 70%, white 18%);
  stroke-width: 1.5;
}

.graph-node.is-selected circle {
  stroke: #fff;
  stroke-width: 2.5;
}
```

The hard-coded white selection stroke follows the model-graphviz contract; node fills remain the documented data-viz exception.

- [ ] **Step 5: Run all tests and syntax validation**

Run: `node --test tests/*.test.js`

Expected: all tests PASS.

Run: `node --check operator-data.js; node --check operator-tree.js; node --check app.js`

Expected: all commands exit with code 0 and no output.

- [ ] **Step 6: Commit when repository support exists**

```bash
git add tests/graph-semantics.test.js app.js styles.css
git commit -m "style: align operator graph with PTO semantic colors"
```

### Task 4: Browser and PTO Verification

**Files:**
- Modify only if verification finds a concrete issue: `operator-graph-pto-demo/index.html`, `operator-graph-pto-demo/styles.css`, `operator-graph-pto-demo/app.js`

**Interfaces:**
- Consumes: completed static demo
- Produces: verified desktop demo at the local HTTP URL

- [ ] **Step 1: Start or reuse the static HTTP server**

Serve `D:\CANN Vision` on port `8123` and open:

`http://localhost:8123/operator-graph-pto-demo/index.html`

- [ ] **Step 2: Verify interactions in the browser**

Check:

- the family, category, list, and operator levels are visible;
- expand/collapse works without layout shifts;
- selecting a category filters the graph;
- selecting a leaf highlights the circular node and updates the inspector;
- clicking a graph node reveals and selects the corresponding leaf;
- search keeps matching ancestors visible;
- all six semantic colors remain readable on the dark PTO graph stage;
- the explorer, graph, and inspector scroll independently.

- [ ] **Step 3: Capture desktop and narrow screenshots**

Capture at `1440x900` and `1024x768`. Confirm no text overlap, clipped tree rows, blank graph, or incoherent pane collision.

- [ ] **Step 4: Run PTO audits**

Run the local container residue search against `index.html`, `styles.css`, and `app.js`.

Run `rtk node ../pto-design-system/scripts/audit-typography.mjs .` when `rtk` is installed. If it remains unavailable, record that limitation without claiming the typography audit passed.

- [ ] **Step 5: Final verification**

Run: `node --test tests/*.test.js`

Expected: all tests PASS.

Run: `node --check operator-data.js; node --check operator-tree.js; node --check app.js`

Expected: all files pass syntax validation.
