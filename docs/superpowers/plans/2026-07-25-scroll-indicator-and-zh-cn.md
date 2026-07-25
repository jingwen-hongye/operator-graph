# Scroll Indicator and Simplified Chinese Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 2x48px vertical Explorer scroll indicator and translate user-facing natural-language content to Simplified Chinese while preserving technical identifiers.

**Architecture:** Add a small browser-and-Node compatible scroll indicator module with a pure position calculator and a DOM mount helper. Keep static copy in `index.html`, operator/category/relationship copy in `operator-data.js`, and dynamic inspector/status copy in `app.js`.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, SVG, Node.js built-in test runner, PTO design-system tokens.

## Global Constraints

- The indicator is exactly 2px wide and 48px high.
- The indicator is 5px from the Explorer right edge and does not capture pointer events.
- Native Explorer scrolling remains the source of truth and the native scrollbar is visually hidden.
- Natural-language UI content is Simplified Chinese.
- API names, formulas, parameter names, data types, prototypes, paths, relation identifiers, framework names, and platform names remain English.
- The directory is not a Git repository, so no commit command can be executed.

---

### Task 1: Explorer Scroll Indicator

**Files:**
- Create: `operator-graph-pto-demo/scroll-indicator.js`
- Create: `operator-graph-pto-demo/tests/scroll-indicator.test.js`
- Modify: `operator-graph-pto-demo/index.html`
- Modify: `operator-graph-pto-demo/app.js`
- Modify: `operator-graph-pto-demo/styles.css`

**Interfaces:**
- Produces: `ScrollIndicator.computeIndicatorState(metrics): { visible: boolean, top: number }`
- Produces: `ScrollIndicator.mount(scrollElement): { update(): void, destroy(): void }`

- [ ] **Step 1: Write the failing position tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeIndicatorState } = require('../scroll-indicator.js');

test('hides when Explorer does not overflow', () => {
  assert.deepEqual(
    computeIndicatorState({ scrollTop: 0, scrollHeight: 500, clientHeight: 500 }),
    { visible: false, top: 8 },
  );
});

test('maps scroll progress into the available indicator track', () => {
  assert.deepEqual(
    computeIndicatorState({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 }),
    { visible: true, top: 8 },
  );
  assert.deepEqual(
    computeIndicatorState({ scrollTop: 250, scrollHeight: 1000, clientHeight: 500 }),
    { visible: true, top: 226 },
  );
  assert.deepEqual(
    computeIndicatorState({ scrollTop: 500, scrollHeight: 1000, clientHeight: 500 }),
    { visible: true, top: 444 },
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/scroll-indicator.test.js`

Expected: FAIL because `scroll-indicator.js` does not exist.

- [ ] **Step 3: Implement the calculator and mount helper**

```js
function computeIndicatorState({
  scrollTop,
  scrollHeight,
  clientHeight,
  indicatorHeight = 48,
  inset = 8,
}) {
  const scrollRange = Math.max(0, scrollHeight - clientHeight);
  const travel = Math.max(0, clientHeight - indicatorHeight - inset * 2);
  const progress = scrollRange ? Math.min(1, Math.max(0, scrollTop / scrollRange)) : 0;
  return { visible: scrollRange > 0, top: Math.round(inset + travel * progress) };
}
```

`mount()` creates `<span class="operator-scroll-indicator" aria-hidden="true">`, appends it to the Explorer scroll element, updates `transform: translateY(...)`, observes the element with `ResizeObserver`, listens for `scroll`, and exposes `update()` for tree re-rendering.

- [ ] **Step 4: Load and mount the module**

Load `scroll-indicator.js` before `app.js`. In `app.js`, mount it on `.operator-pane-scroll`, call `update()` after tree rendering, and keep the existing scroll container unchanged.

- [ ] **Step 5: Add visual styling**

```css
.operator-pane-scroll {
  position: relative;
  scrollbar-width: none;
}

.operator-pane-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.operator-scroll-indicator {
  position: absolute;
  z-index: var(--z-raised);
  top: 0;
  right: 5px;
  width: 2px;
  height: 48px;
  border-radius: var(--radius-pill);
  background: var(--foreground-muted);
  opacity: 0.45;
  pointer-events: none;
  transition: opacity var(--duration-fast) var(--easing-default);
}
```

Increase opacity to `0.72` while the Explorer is hovered or has the `is-scrolling` class.

- [ ] **Step 6: Run and verify GREEN**

Run: `node --test tests/scroll-indicator.test.js`

Expected: two passing tests.

### Task 2: Simplified Chinese Interface Copy

**Files:**
- Create: `operator-graph-pto-demo/tests/localization.test.js`
- Modify: `operator-graph-pto-demo/index.html`
- Modify: `operator-graph-pto-demo/app.js`
- Modify: `operator-graph-pto-demo/operator-data.js`

**Interfaces:**
- Consumes: existing operator records and inspector profiles
- Produces: Simplified Chinese user-facing natural-language copy

- [ ] **Step 1: Write failing localization boundary tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('uses Simplified Chinese for primary interface copy', () => {
  const html = read('index.html');
  const app = read('app.js');
  assert.match(html, /CANN 算子图谱/);
  assert.match(html, /算子详情/);
  assert.match(html, /依赖关系/);
  assert.match(app, /未选择算子/);
  assert.match(app, /可见算子/);
});

test('keeps technical identifiers in English', () => {
  const html = read('index.html');
  const data = read('operator-data.js');
  assert.match(data, /aclnnAdd/);
  assert.match(data, /l0op_call/);
  assert.match(html, /operator-graph\.svg/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/localization.test.js`

Expected: FAIL because primary interface copy is still English.

- [ ] **Step 3: Translate static page copy**

Use these exact primary replacements:

```text
CANN Operator Graph -> CANN 算子图谱
local demo -> 本地演示
Search operator, category, dependency -> 搜索算子、分类或依赖关系
Explorer -> 算子目录
Operator Graph -> 算子图谱
Inspector -> 算子详情
Graph stats -> 图谱统计
Relation types -> 关系类型
Operators -> 算子
Relations -> 关系
Dependency edges -> 依赖关系
Source / Type / Target / Meaning -> 来源 / 类型 / 目标 / 含义
```

Translate button titles and ARIA labels while preserving technical filenames in tabs.

- [ ] **Step 4: Translate dynamic and data copy**

Change category labels to `数学运算类接口`, `激活函数类接口`, `归一化类接口`, `注意力类接口`, `矩阵计算类接口`, and `量化类接口`. Translate their list labels, all operator descriptions, generic parameter descriptions, relationship meanings, empty state, section titles, visible counts, relation counts, interaction hints, and status text.

Map deterministic display values without changing profile storage:

```js
function deterministicLabel(value) {
  if (value === 'Yes') return '是';
  if (value === 'No') return '否';
  return '条件支持';
}
```

- [ ] **Step 5: Run localization and regression tests**

Run: `node --test tests/*.test.js`

Expected: all tests PASS.

Run: `node --check scroll-indicator.js; node --check operator-data.js; node --check operator-tree.js; node --check app.js`

Expected: all files exit with code 0.

### Task 3: Browser and PTO Verification

**Files:**
- Modify only if verification reveals a concrete issue: `operator-graph-pto-demo/index.html`, `operator-graph-pto-demo/styles.css`, `operator-graph-pto-demo/app.js`

- [ ] **Step 1: Verify the local resources**

Confirm the page, CSS, scroll indicator module, operator modules, and app script all return HTTP 200 from the existing local server.

- [ ] **Step 2: Verify browser interactions**

Reload the page, expand categories, scroll from top to bottom, search for `aclnnAdd`, resize the Explorer, and verify the indicator remains 2x48px and tracks scroll progress.

- [ ] **Step 3: Run PTO audits**

Run the container residue scan and `node ../pto-design-system/scripts/audit-typography.mjs .`.

- [ ] **Step 4: Run final verification**

Run all tests and syntax checks again after any browser-driven corrections.
