# Operator Inspector Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed operator summary and five switchable detail tabs to the graph Demo inspector: 算子定义、支持情况、性能、精度、API 学习.

**Architecture:** Add one UMD module that converts existing operator/profile data into a stable inspector model, and one UMD module that renders that model and owns tab event delegation. Keep graph selection and active-tab state in `app.js`; reuse the packaged PTO tab controls and the existing short scroll indicator.

**Tech Stack:** Static HTML/CSS, browser JavaScript, CommonJS-compatible UMD modules, Node.js built-in test runner.

## Global Constraints

- Keep the existing graph, category tree, dependency table, and `2 x 48px` short scroll indicator behavior.
- Use Atlas A2, Ascend A3, and Ascend A5 for support and performance comparisons.
- Label generated performance and precision values as demo data, not official conclusions.
- Keep technical identifiers in English and explanatory copy in Simplified Chinese.
- Preserve the active detail tab when selecting another operator.
- Open external learning links in a new window with `target="_blank"` and `rel="noreferrer"`.

---

## File Structure

- Create `operator-inspector-data.js`: pure data-model generation; no DOM access.
- Create `operator-inspector.js`: tab definitions, HTML rendering, and delegated tab clicks.
- Modify `index.html`: load the two modules before `app.js`.
- Modify `app.js`: add active-tab state and connect selected operators to the two modules.
- Modify `styles.css`: compact tabs, tables, status rows, code blocks, empty states, and responsive behavior.
- Create `tests/operator-inspector-data.test.js`: model completeness and deterministic demo data.
- Create `tests/operator-inspector-view.test.js`: tab markup and content rendering.
- Modify `tests/localization.test.js`: verify the five Simplified Chinese tab labels.

---

### Task 1: Inspector Data Model

**Files:**
- Create: `operator-inspector-data.js`
- Create: `tests/operator-inspector-data.test.js`

**Interfaces:**
- Consumes: `{ op, category, profile, incoming, outgoing }`.
- Produces: `buildInspectorModel(input) -> { summary, definition, support, performance, precision, api }`.
- Exports: `{ HARDWARE, buildInspectorModel }` through CommonJS and `window.OperatorInspectorData`.

- [ ] **Step 1: Write the failing model-completeness test**

```js
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
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/operator-inspector-data.test.js
```

Expected: FAIL because `operator-inspector-data.js` does not exist.

- [ ] **Step 3: Implement the UMD model module**

Use this public shape:

```js
(function exposeOperatorInspectorData(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OperatorInspectorData = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildApi() {
  const HARDWARE = [
    { id: 'a2', name: 'Atlas A2', maturity: 1, peak: 280 },
    { id: 'a3', name: 'Ascend A3', maturity: 0.96, peak: 400 },
    { id: 'a5', name: 'Ascend A5', maturity: 0.9, peak: 640 },
  ];

  const PRECISION = {
    float32: { error: '8.0e-7', cosine: '0.9999995' },
    float16: { error: '9.5e-4', cosine: '0.999930' },
    bfloat16: { error: '3.8e-3', cosine: '0.999710' },
    int8: { error: '1.1e-2', cosine: '0.997200' },
    int32: { error: '0', cosine: '1.000000' },
    int64: { error: '0', cosine: '1.000000' },
  };

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function normalizeDtype(dtype) {
    return String(dtype).trim().toLowerCase();
  }

  function precisionGrade(cosine) {
    const value = Number.parseFloat(cosine);
    if (value >= 0.9999) return '优';
    if (value >= 0.999) return '良';
    return '关注';
  }

  function buildInspectorModel({
    op,
    category,
    profile,
    incoming = 0,
    outgoing = 0,
  }) {
    const params = op.params || [];
    const outputPattern = /(^|_)(out|output|result|y)($|_)/i;
    const toField = ([name, dtype, description]) => ({
      name,
      shape: '—',
      dtype,
      description,
    });
    const inputs = params.filter(([name]) => !outputPattern.test(name)).map(toField);
    const outputs = params.filter(([name]) => outputPattern.test(name)).map(toField);
    if (!outputs.length) {
      outputs.push({
        name: 'out',
        shape: '—',
        dtype: profile.dtypes.join(' / '),
        description: '输出张量',
      });
    }

    const hardware = HARDWARE.map((item) => {
      const seed = hashString(`${op.id}|${item.id}`);
      const a2Listed = profile.platforms.some((name) => /A2|910B/i.test(name));
      const status = item.id === 'a2'
        ? (a2Listed ? 'full' : 'partial')
        : seed % 7 === 0
          ? 'adapting'
          : seed % 3 === 0
            ? 'partial'
            : 'full';
      const dtypes = status === 'adapting'
        ? profile.dtypes.slice(0, 1)
        : status === 'partial'
          ? profile.dtypes.slice(0, Math.max(1, profile.dtypes.length - 1))
          : [...profile.dtypes];
      return {
        ...item,
        status,
        dtypes,
        conditions: status === 'full'
          ? ['无特殊演示约束']
          : status === 'partial'
            ? ['部分数据类型或动态 shape 场景受限']
            : ['演示状态：适配验证中'],
      };
    });

    const performanceRows = hardware.map((item) => {
      const seed = hashString(`${op.id}|performance|${item.id}`);
      const utilization = Math.min(0.92, (0.55 + (seed % 28) / 100) * item.maturity);
      const theoretical = item.peak;
      const measured = theoretical * utilization;
      const h100Measured = 989 * 0.72;
      return {
        hardware: item.name,
        status: item.status,
        metric: op.category === 'attention' ? '融合算力' : '算力',
        dtype: item.dtypes[0] || profile.dtypes[0],
        theoretical,
        measured,
        utilization,
        h100Measured,
        ratio: measured / h100Measured,
        unit: 'TFLOPS',
        demo: true,
      };
    });

    const precisionRows = profile.dtypes.map((dtype) => {
      const normalized = normalizeDtype(dtype);
      const baseline = PRECISION[normalized] || {
        error: '—',
        cosine: '0.999000',
      };
      return {
        dtype,
        error: baseline.error,
        cosine: baseline.cosine,
        grade: precisionGrade(baseline.cosine),
      };
    });

    return {
      summary: {
        name: op.apiName,
        category: category.label,
        computeType: profile.computeType,
        description: op.description,
        formulaCount: op.formulas.length,
        incoming,
        outgoing,
      },
      definition: {
        description: op.description,
        formulas: [...op.formulas],
        inputs,
        outputs,
        params: params.map(toField),
      },
      support: {
        hardware,
        frameworks: [...profile.frameworks],
        deterministic: profile.deterministic,
      },
      performance: {
        rows: performanceRows,
        note: '演示基准，非官方性能结论。',
      },
      precision: {
        rows: precisionRows,
        note: '演示基准，实际精度请以对应 CANN 版本测试为准。',
      },
      api: {
        name: profile.api[0] || op.apiName,
        prototype: profile.prototype,
        params: params.map(([name, dtype, description]) => ({
          name,
          dtype,
          description,
        })),
        steps: ['创建算子执行器', '查询并申请工作区', '异步执行算子并同步结果'],
        golden: profile.golden,
        links: [
          { label: 'CANN 算子仓库', url: 'https://gitcode.com/cann/ops-nn' },
          { label: 'CANN 学习中心', url: 'https://gitcode.com/cann/cann-learning-hub' },
        ],
      },
    };
  }

  return { HARDWARE, buildInspectorModel };
}));
```

Implementation rules:

- `definition.inputs` comes from parameters whose names do not match `out|output|result|y`.
- `definition.outputs` uses matching parameters; if none match, add one `out` row.
- Support status is one of `full`, `partial`, or `adapting`.
- A2 honors existing profile platform data; A3 and A5 use deterministic demo status.
- Performance rows include `metric`, `dtype`, `theoretical`, `measured`, `utilization`, `h100Measured`, `ratio`, and `demo: true`.
- Precision ratings are `优` for cosine >= 0.9999, `良` for >= 0.999, otherwise `关注`.
- API data includes three learning steps and links to `https://gitcode.com/cann/ops-nn` and `https://gitcode.com/cann/cann-learning-hub`.

- [ ] **Step 4: Run the model test and verify GREEN**

Run:

```powershell
node --test tests/operator-inspector-data.test.js
```

Expected: 1 test passes.

- [ ] **Step 5: Commit the model**

```powershell
git add operator-inspector-data.js tests/operator-inspector-data.test.js
git commit -m "Add operator inspector data model"
```

---

### Task 2: Five-Tab Inspector Renderer

**Files:**
- Create: `operator-inspector.js`
- Create: `tests/operator-inspector-view.test.js`

**Interfaces:**
- Consumes: `renderInspector(model, activeTab)` and `bindInspectorTabs(root, onSelect)`.
- Produces: inspector HTML with `[data-inspector-tab]` controls and one active panel.
- Exports: `{ TABS, normalizeTab, renderInspector, renderEmptyInspector, bindInspectorTabs }`.

- [ ] **Step 1: Write the failing renderer test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TABS,
  normalizeTab,
  renderInspector,
} = require('../operator-inspector.js');

const model = {
  summary: {
    name: 'aclnnMatmul',
    category: '矩阵计算类接口',
    computeType: '矩阵计算',
    description: '矩阵乘法。',
    formulaCount: 1,
    incoming: 1,
    outgoing: 2,
  },
  definition: {
    description: '矩阵乘法。',
    formulas: ['Y = XW'],
    inputs: [{ name: 'x', shape: '[M,K]', dtype: 'float16', description: '输入' }],
    outputs: [{ name: 'y', shape: '[M,N]', dtype: 'float16', description: '输出' }],
    params: [],
  },
  support: { hardware: [], frameworks: ['aclnn'], deterministic: '是' },
  performance: { rows: [], note: '演示基准' },
  precision: { rows: [], note: '演示基准' },
  api: { name: 'aclnnMatmul', prototype: 'aclnnStatus aclnnMatmul(...)', params: [], steps: [], links: [] },
};

test('renders five tabs and activates the requested tab', () => {
  assert.equal(TABS.length, 5);
  assert.equal(normalizeTab('bad-value'), 'definition');

  const html = renderInspector(model, 'support');
  assert.match(html, />算子定义</);
  assert.match(html, />支持情况</);
  assert.match(html, />性能</);
  assert.match(html, />精度</);
  assert.match(html, />API 学习</);
  assert.match(html, /data-inspector-panel="support"/);
  assert.match(html, /aria-selected="true"/);
});
```

- [ ] **Step 2: Run the renderer test and verify RED**

Run:

```powershell
node --test tests/operator-inspector-view.test.js
```

Expected: FAIL because `operator-inspector.js` does not exist.

- [ ] **Step 3: Implement renderer and delegated tab binding**

Define tabs exactly:

```js
const TABS = [
  { id: 'definition', label: '算子定义' },
  { id: 'support', label: '支持情况' },
  { id: 'performance', label: '性能' },
  { id: 'precision', label: '精度' },
  { id: 'api', label: 'API 学习' },
];
```

Render:

- Fixed `.operator-inspector-summary`.
- `.operator-inspector-tabs.tab-control` with buttons using `role="tab"`.
- One `.operator-inspector-panel` with the active tab content.
- Tables for definition I/O, performance, and precision.
- Hardware rows with text status plus `.operator-status-glyph`.
- External API links with `target="_blank" rel="noreferrer"`.

Implement event delegation:

```js
function bindInspectorTabs(root, onSelect) {
  const handleClick = (event) => {
    const button = event.target.closest('[data-inspector-tab]');
    if (!button || !root.contains(button)) return;
    onSelect(normalizeTab(button.dataset.inspectorTab));
  };
  root.addEventListener('click', handleClick);
  return () => root.removeEventListener('click', handleClick);
}
```

- [ ] **Step 4: Run the renderer test and verify GREEN**

Run:

```powershell
node --test tests/operator-inspector-view.test.js
```

Expected: renderer tests pass.

- [ ] **Step 5: Commit the renderer**

```powershell
git add operator-inspector.js tests/operator-inspector-view.test.js
git commit -m "Add five-tab operator inspector renderer"
```

---

### Task 3: Main Application Integration

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Create: `tests/operator-inspector-integration.test.js`

**Interfaces:**
- Consumes: `window.OperatorInspectorData.buildInspectorModel` and `window.OperatorInspectorView`.
- Produces: `state.inspectorTab`, selected-operator rendering, and tab-switch behavior.

- [ ] **Step 1: Write the failing source integration test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('loads and connects the inspector modules', () => {
  assert.match(html, /operator-inspector-data\.js/);
  assert.match(html, /operator-inspector\.js/);
  assert.match(app, /inspectorTab:\s*'definition'/);
  assert.match(app, /OperatorInspectorData\.buildInspectorModel/);
  assert.match(app, /OperatorInspectorView\.renderInspector/);
  assert.match(app, /OperatorInspectorView\.bindInspectorTabs/);
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```powershell
node --test tests/operator-inspector-integration.test.js
```

Expected: FAIL because the scripts and state connection are absent.

- [ ] **Step 3: Load modules before `app.js`**

Add to `index.html`:

```html
<script src="./operator-inspector-data.js"></script>
<script src="./operator-inspector.js"></script>
<script src="./app.js"></script>
```

- [ ] **Step 4: Connect state and rendering**

In `app.js`:

```js
const { buildInspectorModel } = window.OperatorInspectorData;
const {
  renderInspector: renderInspectorView,
  renderEmptyInspector,
  bindInspectorTabs,
} = window.OperatorInspectorView;

const state = {
  activeCategory: null,
  expanded: new Set(['aclnn', 'math', 'math-list']),
  selected: null,
  query: '',
  inspectorTab: 'definition',
  transform: { x: 0, y: 0, k: 1 },
};
```

Replace the current inspector template with:

```js
if (!op) {
  inspector.innerHTML = renderEmptyInspector();
  return;
}

const model = buildInspectorModel({
  op,
  category: categories[op.category],
  profile: profileFor(op),
  incoming,
  outgoing,
});
inspector.innerHTML = renderInspectorView(model, state.inspectorTab);
```

Bind once after element setup:

```js
bindInspectorTabs(inspector, (tab) => {
  state.inspectorTab = tab;
  inspector.scrollTop = 0;
  renderInspector();
  requestAnimationFrame(inspectorScrollIndicator.update);
});
```

- [ ] **Step 5: Run integration and existing scroll tests**

Run:

```powershell
node --test tests/operator-inspector-integration.test.js tests/scroll-indicator*.test.js
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit the integration**

```powershell
git add index.html app.js tests/operator-inspector-integration.test.js
git commit -m "Connect inspector tabs to graph selection"
```

---

### Task 4: PTO-Aligned Inspector Styling

**Files:**
- Modify: `styles.css`
- Modify: `tests/localization.test.js`

**Interfaces:**
- Consumes: renderer class names from Task 2.
- Produces: responsive, scroll-safe tab and table presentation.

- [ ] **Step 1: Add failing localization assertions**

Add:

```js
const inspectorView = fs.readFileSync(
  path.join(__dirname, '..', 'operator-inspector.js'),
  'utf8',
);

['算子定义', '支持情况', '性能', '精度', 'API 学习'].forEach((label) => {
  assert.match(inspectorView, new RegExp(label));
});
```

- [ ] **Step 2: Run localization tests**

Run:

```powershell
node --test tests/localization.test.js
```

Expected: PASS after Task 2; this protects the finalized copy during styling.

- [ ] **Step 3: Add scoped inspector styles**

Add styles for:

```css
.operator-inspector-summary {}
.operator-inspector-tabs {}
.operator-inspector-panel {}
.operator-detail-table {}
.operator-support-list {}
.operator-support-row {}
.operator-status-glyph {}
.operator-learning-steps {}
.operator-api-links {}
.operator-demo-note {}
```

Required behavior:

- Summary remains compact and uses existing PTO typography tokens.
- Tabs use `.tab-control` / `.tab-control-item`, stay one line, and horizontally scroll without a visible native scrollbar.
- Tables use `min-width` and a local horizontal overflow wrapper.
- Status uses glyph + text for `full`, `partial`, and `adapting`.
- No nested decorative cards and no gradient backgrounds.
- At `max-width: 980px`, table cells keep readable widths and API links wrap.

- [ ] **Step 4: Run syntax and full tests**

Run:

```powershell
node --check operator-inspector-data.js
node --check operator-inspector.js
node --check app.js
node --test tests/*.test.js
```

Expected: all tests pass with zero failures.

- [ ] **Step 5: Commit styles**

```powershell
git add styles.css tests/localization.test.js
git commit -m "Style operator inspector detail tabs"
```

---

### Task 5: Browser, Deployment, and Final Verification

**Files:**
- Verify only; modify files only if a concrete defect is found through a new failing test.

**Interfaces:**
- Consumes: completed local app.
- Produces: verified GitHub Pages deployment.

- [ ] **Step 1: Verify the local server assets**

Check these URLs return HTTP 200:

```text
http://localhost:8123/operator-graph-demo/
http://localhost:8123/operator-graph-demo/operator-inspector-data.js
http://localhost:8123/operator-graph-demo/operator-inspector.js
```

- [ ] **Step 2: Inspect desktop and narrow layouts**

At approximately `1440 x 900` and `804 x 858`:

- Select one operator from the tree and one from the graph.
- Switch through all five tabs.
- Confirm selection changes preserve the active tab.
- Confirm tables scroll inside the panel without page overlap.
- Confirm the `2 x 48px` short scrollbar updates after each tab.
- Confirm all generated performance and precision areas display the demo-data note.

- [ ] **Step 3: Run final automated verification**

```powershell
node --check operator-inspector-data.js
node --check operator-inspector.js
node --check app.js
node --test tests/*.test.js
git status --short --branch
```

Expected: zero syntax errors, zero test failures, and only intentional commits.

- [ ] **Step 4: Push and verify Pages**

```powershell
git push
```

Wait for the `pages build and deployment` workflow for the new head SHA to complete successfully. Then verify:

```text
https://jingwen-hongye.github.io/operator-graph/
https://jingwen-hongye.github.io/operator-graph/operator-inspector-data.js
https://jingwen-hongye.github.io/operator-graph/operator-inspector.js
```

Expected: all return HTTP 200 and the online inspector shows all five tabs.
