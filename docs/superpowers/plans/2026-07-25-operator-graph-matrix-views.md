# Operator Graph And Support Matrix Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add switchable 算子图谱 and 支持矩阵 views to the center pane while keeping Explorer filters, operator selection, graph transform, and inspector content synchronized.

**Architecture:** Add one focused UMD matrix module that converts visible operators plus their existing inspector support models into accessible matrix markup. The application owns a `centerView` state and toggles two sibling tab panels without rebuilding or resetting the graph transform. Matrix clicks call the existing `selectOperator()` path so every view shares one selection source.

**Tech Stack:** Static HTML, CSS, browser JavaScript, CommonJS-compatible UMD modules, Node.js built-in test runner, PTO `ide-frame` and shared design tokens.

## Global Constraints

- Center tabs are named exactly `算子图谱` and `支持矩阵`.
- The initial center view is `graph`.
- Hardware columns are exactly `Atlas A2`, `Ascend A3`, and `Ascend A5`.
- Matrix support values must come from the same `buildInspectorModel()` support model used by the right inspector.
- Switching views must preserve selected operator, active category, search query, inspector tab, and graph transform.
- Matrix operator and support cells must be keyboard-focusable.
- Status must be represented by glyph and Simplified Chinese text, not color alone.
- The existing PTO `ide-frame` shell, pane layout, and bottom dependency table remain unchanged.
- Do not copy the reference Demo shell, drawer, model filters, private palette, card shadows, or rounded matrix frame.
- Use shared PTO typography, spacing, surfaces, status colors, and subtle table separators.
- Matrix overflow remains local to the center pane; content must not be scaled down.

---

### Task 1: Matrix Model And Renderer

**Files:**
- Create: `operator-matrix.js`
- Create: `tests/operator-matrix.test.js`

**Interfaces:**
- Consumes: `buildMatrixModel(operators, getInspectorModel)` receives visible operator objects and a callback returning the existing inspector model for one operator.
- Produces: `window.OperatorMatrixView` and CommonJS exports `{ HARDWARE_IDS, buildMatrixModel, renderMatrix, renderMatrixEmpty, bindMatrixSelection }`.
- `buildMatrixModel()` returns `{ hardware, rows }`, where every row contains `id`, `apiName`, `category`, `color`, and three hardware cells.

- [ ] **Step 1: Write the failing matrix model tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('../operator-data.js');
const inspectorData = require('../operator-inspector-data.js');
const matrix = require('../operator-matrix.js');

function inspectorFor(op) {
  return inspectorData.buildInspectorModel({
    op,
    category: data.categories[op.category],
    profile: {
      computeType: '示例算子',
      platforms: ['Atlas A2'],
      frameworks: ['aclnn'],
      prototype: 'aclnnStatus example()',
      golden: 'golden/example.npy',
      deterministic: 'Yes',
      dtypes: ['float16', 'float32'],
    },
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/operator-matrix.test.js`

Expected: FAIL because `operator-matrix.js` does not exist.

- [ ] **Step 3: Implement the model, safe renderer, and delegated click binding**

```js
(function exposeOperatorMatrix(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OperatorMatrixView = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildApi() {
  const HARDWARE_IDS = ['a2', 'a3', 'a5'];
  const STATUS = {
    full: { glyph: '●', label: '完全支持' },
    partial: { glyph: '◐', label: '部分支持' },
    adapting: { glyph: '–', label: '适配中' },
  };

  function buildMatrixModel(operators, getInspectorModel) {
    const rows = operators.map((op) => {
      const inspector = getInspectorModel(op);
      return {
        id: op.id,
        apiName: op.apiName,
        category: inspector.summary.category,
        color: op.color,
        hardware: inspector.support.hardware.map((item) => ({ ...item })),
      };
    });
    const hardware = rows[0]
      ? rows[0].hardware.map(({ id, name }) => ({ id, name }))
      : HARDWARE_IDS.map((id, index) => ({
        id,
        name: ['Atlas A2', 'Ascend A3', 'Ascend A5'][index],
      }));
    return { hardware, rows };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function renderMatrix(model, selectedId) {
    if (!model.rows.length) return renderMatrixEmpty();
    const headers = model.hardware.map((item) => (
      `<th scope="col"><strong>${escapeHtml(item.name)}</strong><span>训练 / 推理</span></th>`
    )).join('');
    const rows = model.rows.map((row) => {
      const cells = row.hardware.map((item) => {
        const status = STATUS[item.status] || STATUS.adapting;
        return `<td><button type="button" class="operator-matrix-cell"
          data-matrix-operator="${escapeHtml(row.id)}"
          data-matrix-hardware="${escapeHtml(item.id)}">
          <span class="operator-matrix-status is-${escapeHtml(item.status)}">
            <span aria-hidden="true">${status.glyph}</span>${status.label}
          </span>
          <span class="operator-matrix-dtypes">${item.dtypes.map(escapeHtml).join(' / ')}</span>
        </button></td>`;
      }).join('');
      return `<tr class="${row.id === selectedId ? 'is-selected' : ''}">
        <th class="operator-matrix-operator" scope="row">
          <button type="button" data-matrix-operator="${escapeHtml(row.id)}">
            <span class="operator-matrix-dot" style="--dot-color:${escapeHtml(row.color)}"></span>
            <span><strong>${escapeHtml(row.apiName)}</strong><small>${escapeHtml(row.category)}</small></span>
          </button>
        </th>${cells}
      </tr>`;
    }).join('');
    return `<table class="operator-matrix-table">
      <thead><tr><th class="operator-matrix-corner" scope="col">算子 / 硬件</th>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderMatrixEmpty() {
    return `<div class="operator-matrix-empty">
      <h3>没有匹配的算子</h3>
      <p>请调整左侧分类或搜索条件。</p>
    </div>`;
  }

  function bindMatrixSelection(rootElement, onSelect) {
    const handleClick = (event) => {
      const target = event.target.closest?.('[data-matrix-operator]');
      if (!target || !rootElement.contains(target)) return;
      onSelect(target.dataset.matrixOperator, target.dataset.matrixHardware || null);
    };
    rootElement.addEventListener('click', handleClick);
    return () => rootElement.removeEventListener('click', handleClick);
  }

  return {
    HARDWARE_IDS,
    buildMatrixModel,
    renderMatrix,
    renderMatrixEmpty,
    bindMatrixSelection,
  };
}));
```

- [ ] **Step 4: Expand rendering tests**

```js
test('renders headers, statuses, selection, and escaped labels', () => {
  const model = matrix.buildMatrixModel(data.operators.slice(0, 3), inspectorFor);
  model.rows[0].apiName = '<unsafe>';
  const html = matrix.renderMatrix(model, model.rows[0].id);
  assert.match(html, /Atlas A2/);
  assert.match(html, /Ascend A3/);
  assert.match(html, /Ascend A5/);
  assert.match(html, /完全支持|部分支持|适配中/);
  assert.match(html, /<tr class="is-selected">/);
  assert.match(html, /&lt;unsafe&gt;/);
  assert.doesNotMatch(html, /<unsafe>/);
});

test('renders an empty state', () => {
  assert.match(matrix.renderMatrix({ hardware: [], rows: [] }), /没有匹配的算子/);
});
```

- [ ] **Step 5: Run focused and full tests**

Run:

```powershell
node --check operator-matrix.js
node --test tests/operator-matrix.test.js
node --test tests/*.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add operator-matrix.js tests/operator-matrix.test.js
git commit -m "Add operator support matrix renderer"
```

---

### Task 2: Center Tab Panels And View State

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Create: `tests/center-view-integration.test.js`

**Interfaces:**
- Consumes: `OperatorMatrixView.buildMatrixModel()` and `OperatorMatrixView.renderMatrix()`.
- Produces: application state `centerView: 'graph' | 'matrix'`, `setCenterView(view)`, and `renderMatrixView()`.
- The graph panel id is `operator-graph-panel`; the matrix panel id is `operator-matrix-panel`.

- [ ] **Step 1: Write failing HTML and state integration tests**

```js
test('loads matrix module before app and declares two center tabs', () => {
  assert.match(html, /operator-matrix\.js[\s\S]*app\.js/);
  assert.match(html, /data-center-view="graph"/);
  assert.match(html, /data-center-view="matrix"/);
  assert.match(html, />算子图谱</);
  assert.match(html, />支持矩阵</);
});

test('defaults to graph and preserves transform while changing views', () => {
  assert.match(app, /centerView:\s*'graph'/);
  assert.match(app, /function setCenterView\(view\)/);
  assert.doesNotMatch(app, /setCenterView[\s\S]*state\.transform\s*=/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/center-view-integration.test.js`

Expected: FAIL because center view controls and matrix assets are absent.

- [ ] **Step 3: Replace the editor file tabs with view tabs**

Use this structure in `index.html`:

```html
<div class="pto-ide-frame__tabstrip">
  <div class="tab-control operator-center-tabs" role="tablist" aria-label="中间视图">
    <button id="operator-graph-tab" class="tab-control-item is-selected"
      type="button" role="tab" data-center-view="graph"
      aria-selected="true" aria-controls="operator-graph-panel">算子图谱</button>
    <button id="operator-matrix-tab" class="tab-control-item"
      type="button" role="tab" data-center-view="matrix"
      aria-selected="false" aria-controls="operator-matrix-panel">支持矩阵</button>
  </div>
</div>
```

Place the current SVG inside:

```html
<div id="operator-graph-panel" class="operator-center-view operator-graph-host"
  role="tabpanel" aria-labelledby="operator-graph-tab">
  <svg id="operator-graph" role="img" aria-label="CANN 算子依赖图谱">
    <g id="graph-viewport">
      <g id="graph-links"></g>
      <g id="graph-nodes"></g>
    </g>
  </svg>
  <div id="operator-tooltip" class="operator-tooltip" hidden></div>
</div>
```

Add the sibling matrix panel:

```html
<div id="operator-matrix-panel" class="operator-center-view operator-matrix-host"
  role="tabpanel" aria-labelledby="operator-matrix-tab" hidden>
  <div id="operator-matrix" class="operator-matrix-scroll"></div>
</div>
```

Load `operator-matrix.js` after inspector modules and before `app.js`.

- [ ] **Step 4: Add view state and switching behavior**

```js
const {
  buildMatrixModel,
  renderMatrix,
  bindMatrixSelection,
} = window.OperatorMatrixView;

const state = {
  activeCategory: null,
  expanded: new Set(['aclnn', 'math', 'math-list']),
  selected: null,
  query: '',
  inspectorTab: 'definition',
  transform: { x: 0, y: 0, k: 1 },
  centerView: 'graph',
};

function setCenterView(view) {
  state.centerView = view === 'matrix' ? 'matrix' : 'graph';
  document.querySelectorAll('[data-center-view]').forEach((tab) => {
    const selected = tab.dataset.centerView === state.centerView;
    tab.classList.toggle('is-selected', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  graphPanel.hidden = state.centerView !== 'graph';
  matrixPanel.hidden = state.centerView !== 'matrix';
  updateCenterHeader();
  if (state.centerView === 'matrix') renderMatrixView();
}
```

Bind clicks on `[data-center-view]` to `setCenterView()`. Do not call
`fitGraph()` during tab changes.

- [ ] **Step 5: Run focused and full tests**

Run:

```powershell
node --check app.js
node --test tests/center-view-integration.test.js
node --test tests/*.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html app.js tests/center-view-integration.test.js
git commit -m "Add graph and matrix center tabs"
```

---

### Task 3: Shared Filtering And Selection

**Files:**
- Modify: `app.js`
- Modify: `tests/center-view-integration.test.js`

**Interfaces:**
- Consumes: existing `visibleOperators()`, `profileFor(op)`, `selectOperator(id)`, and `buildInspectorModel()`.
- Produces: `buildModelForOperator(op)` as the one inspector/matrix model factory and `renderMatrixView()` as the synchronized matrix update.

- [ ] **Step 1: Add failing shared-data and selection tests**

```js
test('matrix consumes the shared visible operator and inspector model paths', () => {
  assert.match(app, /buildMatrixModel\(visibleOperators\(\),\s*buildModelForOperator\)/);
  assert.match(app, /function buildModelForOperator\(op\)/);
  assert.match(app, /bindMatrixSelection\(matrixRoot,\s*\(operatorId/);
  assert.match(app, /selectOperator\(operatorId\)/);
});

test('render updates the active center view without resetting it', () => {
  assert.match(app, /function render\(\)[\s\S]*renderMatrixView\(\)/);
  assert.doesNotMatch(app, /function render\(\)[\s\S]*centerView\s*=\s*'graph'/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/center-view-integration.test.js`

Expected: FAIL until the shared model helper and click binding are present.

- [ ] **Step 3: Extract one operator model factory**

```js
function buildModelForOperator(op) {
  const profile = profileFor(op);
  return buildInspectorModel({
    op,
    category: categories[op.category],
    profile,
    incoming: links.filter(([, target]) => target === op.id).length,
    outgoing: links.filter(([source]) => source === op.id).length,
  });
}
```

Use `buildModelForOperator(op)` in both `renderInspector()` and
`renderMatrixView()`.

- [ ] **Step 4: Connect matrix rendering and selection**

```js
function renderMatrixView() {
  const model = buildMatrixModel(visibleOperators(), buildModelForOperator);
  matrixRoot.innerHTML = renderMatrix(model, state.selected);
}

bindMatrixSelection(matrixRoot, (operatorId) => {
  selectOperator(operatorId);
});
```

Call `renderMatrixView()` from the main `render()` path so matrix content stays
current even while the graph view is active. Hidden matrix rendering must not
change graph transform.

- [ ] **Step 5: Run focused and full tests**

Run:

```powershell
node --test tests/center-view-integration.test.js
node --test tests/operator-matrix.test.js
node --test tests/*.test.js
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add app.js tests/center-view-integration.test.js
git commit -m "Synchronize graph and matrix selection"
```

---

### Task 4: PTO Matrix Styling And Responsive Overflow

**Files:**
- Modify: `styles.css`
- Create: `tests/operator-matrix-styles.test.js`

**Interfaces:**
- Consumes: matrix classes emitted by `operator-matrix.js`.
- Produces: stable pane-local table geometry, sticky header and first column, status colors, selected row state, and narrow-pane overflow.

- [ ] **Step 1: Write failing selector and behavior tests**

```js
const required = [
  '.operator-center-view',
  '.operator-matrix-host',
  '.operator-matrix-scroll',
  '.operator-matrix-table',
  '.operator-matrix-operator',
  '.operator-matrix-cell',
  '.operator-matrix-status',
];

test('styles the matrix and keeps overflow local', () => {
  required.forEach((selector) => {
    assert.match(css, new RegExp(selector.replace('.', '\\.')));
  });
  assert.match(css, /\.operator-matrix-scroll\s*\{[\s\S]*overflow:\s*auto/);
  assert.match(css, /\.operator-matrix-table\s*\{[\s\S]*min-width:/);
});

test('keeps headers visible and uses semantic statuses', () => {
  assert.match(css, /\.operator-matrix-table thead[\s\S]*position:\s*sticky/);
  assert.match(css, /\.operator-matrix-operator[\s\S]*position:\s*sticky/);
  assert.match(css, /\.operator-matrix-status\.is-full[\s\S]*var\(--success\)/);
  assert.match(css, /\.operator-matrix-status\.is-partial[\s\S]*var\(--warning\)/);
});
```

- [ ] **Step 2: Run the style test and verify RED**

Run: `node --test tests/operator-matrix-styles.test.js`

Expected: FAIL because matrix styles do not exist.

- [ ] **Step 3: Add PTO-scoped matrix rules**

```css
.operator-center-view {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.operator-matrix-host { overflow: hidden; }

.operator-matrix-scroll {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.operator-matrix-table {
  width: 100%;
  min-width: 680px;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--foreground-secondary);
  font: var(--type-body-sm);
}

.operator-matrix-table th,
.operator-matrix-table td {
  border-bottom: 1px solid var(--border-subtle);
}

.operator-matrix-table thead th {
  position: sticky;
  z-index: 2;
  top: 0;
  background: var(--ide-frame-pane-bg);
}

.operator-matrix-operator {
  position: sticky;
  z-index: 1;
  left: 0;
  background: var(--ide-frame-pane-bg);
}

.operator-matrix-table tr.is-selected th,
.operator-matrix-table tr.is-selected td {
  background: var(--state-selected);
}

.operator-matrix-status.is-full { color: var(--success); }
.operator-matrix-status.is-partial { color: var(--warning); }
.operator-matrix-status.is-adapting { color: var(--foreground-muted); }

@media (max-width: 980px) {
  .operator-matrix-table { min-width: 680px; }
}
```

Do not add a border, box shadow, gradient, or rounded outer shell to
`.operator-matrix-host` or `.operator-matrix-scroll`.

At `max-width: 980px`, retain the same minimum table width and allow local
scrolling rather than shrinking text.

- [ ] **Step 4: Run style, full, and formatting checks**

Run:

```powershell
node --test tests/operator-matrix-styles.test.js
node --test tests/*.test.js
git diff --check
```

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 5: Commit**

```powershell
git add styles.css tests/operator-matrix-styles.test.js
git commit -m "Style PTO operator support matrix"
```

---

### Task 5: Browser Verification And Pull Request Update

**Files:**
- Modify only if verification reveals a defect.

**Interfaces:**
- Consumes: completed graph and matrix views.
- Produces: verified local preview and updated remote feature branch.

- [ ] **Step 1: Run fresh automated verification**

Run:

```powershell
node --check app.js
node --check operator-matrix.js
node --check operator-inspector-data.js
node --check operator-inspector.js
node --test tests/*.test.js
git diff --check
```

Expected: all checks PASS.

- [ ] **Step 2: Start the feature worktree preview**

Serve the worktree on an unused localhost port. Verify `index.html`,
`operator-matrix.js`, `operator-inspector.js`, `styles.css`, and `app.js`
return HTTP 200.

- [ ] **Step 3: Verify desktop behavior**

At approximately `1440 × 900`:

- default tab is 算子图谱
- switching to 支持矩阵 keeps the same selected operator
- matrix shows Atlas A2, Ascend A3, and Ascend A5
- clicking an operator row updates Explorer and inspector
- clicking each center tab repeatedly is stable
- returning to graph preserves pan and zoom
- matrix header and first column remain visible while scrolling
- no text overlap or pane overflow is visible

- [ ] **Step 4: Verify narrow behavior**

At approximately `804 × 858`:

- center tabs remain usable
- matrix scrolls horizontally within the pane
- table text remains readable
- right inspector and bottom dependency table remain coherent
- existing 2 × 48px short scroll indicators still behave correctly

- [ ] **Step 5: Run the PTO typography audit**

From `D:\CANN Vision\pto-design-system`, run the typography audit against:

`D:\CANN Vision\operator-graph-demo\.worktrees\operator-inspector-tabs\styles.css`

Expected: no unapproved prose below 14px, ordinary UI below 12px, or page-scale
font transformations.

- [ ] **Step 6: Push the updated branch**

```powershell
git push origin feature/operator-inspector-tabs
```

Confirm Pull Request #1 includes the matrix commits:

`https://github.com/jingwen-hongye/operator-graph/pull/1`
