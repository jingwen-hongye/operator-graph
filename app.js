const { categories, operators, links } = window.OperatorDemoData;
const { buildTree, filterTree } = window.OperatorTree;
const buildInspectorModel = window.OperatorInspectorData.buildInspectorModel;
const renderInspectorView = window.OperatorInspectorView.renderInspector;
const renderEmptyInspector = window.OperatorInspectorView.renderEmptyInspector;
const bindInspectorTabs = window.OperatorInspectorView.bindInspectorTabs;
const buildMatrixModel = window.OperatorMatrixView.buildMatrixModel;
const renderMatrix = window.OperatorMatrixView.renderMatrix;
const renderMatrixEmpty = window.OperatorMatrixView.renderMatrixEmpty;
const bindMatrixSelection = window.OperatorMatrixView.bindMatrixSelection;const operatorTree = buildTree(categories, operators);

const operatorProfiles = {
  add: { computeType: '逐元素算术', platforms: ['Ascend 310P', 'Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU'], api: ['aclnnAdd', 'aclrtMemcpyAsync'], prototype: 'aclnnStatus aclnnAdd(aclnnTensor* x1, aclnnTensor* x2, aclScalar* alpha, aclnnTensor* y)', golden: 'golden/add_fp16_broadcast.npy', deterministic: 'Yes', dtypes: ['float16', 'float32', 'int32', 'int64'] },
  mul: { computeType: '逐元素算术', platforms: ['Ascend 310P', 'Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU'], api: ['aclnnMul', 'l0op::Mul'], prototype: 'aclnnStatus aclnnMul(aclnnTensor* x1, aclnnTensor* x2, aclnnTensor* y)', golden: 'golden/mul_fp16.npy', deterministic: 'Yes', dtypes: ['float16', 'float32', 'int32'] },
  reduce_sum: { computeType: '归约计算', platforms: ['Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore'], api: ['aclnnReduceSum', 'l0op::ReduceSum'], prototype: 'aclnnStatus aclnnReduceSum(aclnnTensor* x, aclIntArray* axes, bool keepdims, aclnnTensor* y)', golden: 'golden/reduce_sum_axis.npy', deterministic: 'Conditional', dtypes: ['float16', 'float32', 'int32'] },
  matmul: { computeType: '矩阵计算', platforms: ['Ascend 310P', 'Ascend 910A', 'Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU', 'TensorFlow Adapter'], api: ['aclnnMatmul', 'aclnnMm', 'l0op::MatMul'], prototype: 'aclnnStatus aclnnMatmul(aclnnTensor* a, aclnnTensor* b, aclnnTensor* bias, aclnnTensor* out)', golden: 'golden/matmul_fp16_transpose.npy', deterministic: 'Yes', dtypes: ['float16', 'bfloat16', 'float32', 'int8'] },
  batch_matmul: { computeType: '批量矩阵计算', platforms: ['Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU'], api: ['aclnnBatchMatMul', 'l0op::BatchMatMul'], prototype: 'aclnnStatus aclnnBatchMatMul(aclnnTensor* a, aclnnTensor* b, aclnnTensor* bias, aclnnTensor* out)', golden: 'golden/batch_matmul_3d.npy', deterministic: 'Yes', dtypes: ['float16', 'bfloat16', 'float32'] },
  flash_attention_score: { computeType: '融合注意力计算', platforms: ['Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU'], api: ['aclnnFlashAttentionScore', 'aclnnPromptFlashAttention'], prototype: 'aclnnStatus aclnnFlashAttentionScore(aclnnTensor* query, aclnnTensor* key, aclnnTensor* value, aclnnTensor* attentionOut)', golden: 'golden/flash_attention_score_bsh.npy', deterministic: 'No', dtypes: ['float16', 'bfloat16'] },
  softmax: { computeType: '激活归一化', platforms: ['Ascend 310P', 'Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU'], api: ['aclnnSoftmax', 'l0op::Softmax'], prototype: 'aclnnStatus aclnnSoftmax(aclnnTensor* x, int64_t axis, aclnnTensor* y)', golden: 'golden/softmax_axis_minus1.npy', deterministic: 'Yes', dtypes: ['float16', 'float32', 'bfloat16'] },
};

function toPascal(value) { return value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(''); }
function profileFor(op) {
  return operatorProfiles[op.id] || {
    computeType: `${categories[op.category].label.replace('类接口', '')}算子`, platforms: ['Ascend 910B', 'Atlas A2'], frameworks: ['aclnn', 'MindSpore', 'PyTorch NPU'], api: [op.apiName], prototype: `aclnnStatus ${op.apiName}(aclnnTensor* x, aclnnTensor* y)`, golden: `golden/${op.id}_baseline.npy`, deterministic: op.category === 'attention' ? 'No' : 'Yes', dtypes: op.category === 'quant' ? ['int8', 'float16', 'bfloat16'] : ['float16', 'float32'],
  };
}

const state = {
  activeCategory: null,
  expanded: new Set(['aclnn', 'math', 'math-list']),
  selected: null,
  query: '',
  inspectorTab: 'definition',
  centerView: 'graph',
  transform: { x: 0, y: 0, k: 1 },
};
const byId = new Map(operators.map((op) => [op.id, op]));
const graphSvg = document.querySelector('#operator-graph');
const graphPanel = document.querySelector('#operator-graph-panel');
const matrixPanel = document.querySelector('#operator-matrix-panel');
const matrixRoot = document.querySelector('#operator-matrix');
const centerViewTitle = document.querySelector('#center-view-title');
const graphReadout = document.querySelector('#graph-readout');
const fitGraphButton = document.querySelector('#fit-graph');const viewport = document.querySelector('#graph-viewport');
const linkLayer = document.querySelector('#graph-links');
const nodeLayer = document.querySelector('#graph-nodes');
const tooltip = document.querySelector('#operator-tooltip');
const searchInput = document.querySelector('#operator-search-input');
const inspector = document.querySelector('#operator-inspector');
const edgeBody = document.querySelector('#edge-table-body');
const explorerScroll = document.querySelector('.operator-pane-scroll');
const inspectorScroll = inspector;
const edgeTableScroll = document.querySelector('.operator-edge-table-wrap');
const explorerScrollIndicator = window.ScrollIndicator.mount(explorerScroll);
const inspectorScrollIndicator = window.ScrollIndicator.mount(inspectorScroll);
const edgeTableScrollIndicator = window.ScrollIndicator.mount(edgeTableScroll);

bindInspectorTabs(inspector, (tab) => {
  state.inspectorTab = tab;
  inspector.scrollTop = 0;
  renderInspector();
  requestAnimationFrame(inspectorScrollIndicator.update);
});

document.querySelectorAll('[data-center-view]').forEach((tab) => {
  tab.addEventListener('click', () => setCenterView(tab.dataset.centerView));
});

function visibleOperators() {
  const query = state.query.trim().toLowerCase();
  return operators.filter((op) => (
    (!state.activeCategory || op.category === state.activeCategory)
    && (!query || [op.apiName, op.id, op.category, op.description, op.repo]
      .some((text) => text.toLowerCase().includes(query)))
  ));
}
function visibleLinks(visibleIds) { return links.filter(([source, target]) => visibleIds.has(source) && visibleIds.has(target)); }
function updateCenterHeader() {
  const matrixActive = state.centerView === 'matrix';
  centerViewTitle.textContent = matrixActive ? '支持矩阵' : '算子图谱';
  graphReadout.textContent = matrixActive
    ? 'Atlas A2 / Ascend A3 / Ascend A5'
    : `缩放 ${(state.transform.k * 100).toFixed(0)}%`;
  fitGraphButton.disabled = matrixActive;
}

function renderMatrixView() {
  matrixRoot.innerHTML = renderMatrixEmpty();
}

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

function applyTransform() {
  viewport.setAttribute('transform', `translate(${state.transform.x} ${state.transform.y}) scale(${state.transform.k})`);
  if (state.centerView === 'graph') updateCenterHeader();
}

function fitGraph() {
  if (state.centerView !== 'graph') return;
  const box = graphSvg.getBoundingClientRect();
  state.transform = {
    x: box.width / 2,
    y: box.height / 2,
    k: Math.min(box.width / 1160, box.height / 860),
  };
  applyTransform();
}
function selectOperator(id) {
  const op = byId.get(id);
  state.selected = op ? id : null;
  if (op) {
    state.expanded.add('aclnn');
    state.expanded.add(op.category);
    state.expanded.add(`${op.category}-list`);
  }
  render();
  if (op) requestAnimationFrame(() => document.querySelector(`[data-tree-operator="${op.id}"]`)?.scrollIntoView({ block: 'nearest' }));
}

function renderCategories() {
  const root = document.querySelector('#category-list');
  const tree = filterTree(operatorTree, state.query);
  const searchActive = Boolean(state.query.trim());
  root.innerHTML = '';
  root.setAttribute('role', 'tree');

  function appendNode(item, level, parent) {
    const hasChildren = Boolean(item.children?.length);
    const expanded = searchActive || state.expanded.has(item.id);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `operator-tree-row is-${item.kind} level-${level}`;

    row.setAttribute('role', 'treeitem');
    if (hasChildren) row.setAttribute('aria-expanded', String(expanded));
    if (item.kind === 'category') row.dataset.treeCategory = item.id;
    if (item.kind === 'operator') row.dataset.treeOperator = item.id;
    if (item.kind === 'category' && state.activeCategory === item.id) row.classList.add('is-active-category');
    if (item.kind === 'operator' && state.selected === item.id) row.classList.add('is-selected');

    const disclosure = document.createElement('span');
    disclosure.className = `operator-tree-disclosure ${hasChildren ? '' : 'is-empty'} ${expanded ? 'is-expanded' : ''}`;
    disclosure.textContent = hasChildren ? '›' : '';
    row.appendChild(disclosure);

    if (item.kind === 'category') {
      const dot = document.createElement('span');
      dot.className = 'operator-tree-dot';
      dot.style.setProperty('--dot-color', item.color);
      row.appendChild(dot);
    }

    const label = document.createElement('span');
    label.className = 'operator-tree-label';
    label.textContent = item.kind === 'operator' ? item.apiName : item.label;
    row.appendChild(label);

    if (hasChildren) {
      const count = document.createElement('span');
      count.className = 'operator-tree-count';
      count.textContent = item.kind === 'family'
        ? operators.length
        : item.kind === 'category'
          ? item.children[0].children.length
          : item.children.length;
      row.appendChild(count);
    }

    row.addEventListener('click', () => {
      if (item.kind === 'operator') {
        selectOperator(item.id);
        return;
      }
      if (item.kind === 'category') {
        const isCurrent = state.activeCategory === item.id;
        state.activeCategory = isCurrent ? null : item.id;
        if (isCurrent && expanded) {
          state.expanded.delete(item.id);
        } else {
          state.expanded.add(item.id);
          state.expanded.add(`${item.id}-list`);
        }
      } else if (expanded) {
        state.expanded.delete(item.id);
      } else {
        state.expanded.add(item.id);
      }
      render();
      requestAnimationFrame(fitGraph);
    });

    parent.appendChild(row);
    if (hasChildren && expanded) item.children.forEach((child) => appendNode(child, level + 1, parent));
  }

  appendNode(tree, 0, root);
}

function renderGraph() {
  const visible = visibleOperators();
  const visibleIds = new Set(visible.map((op) => op.id));
  const selected = state.selected && visibleIds.has(state.selected) ? state.selected : null;
  const related = new Set();
  if (selected) links.forEach(([source, target]) => { if (source === selected) related.add(target); if (target === selected) related.add(source); });

  linkLayer.innerHTML = '';
  visibleLinks(visibleIds).forEach(([source, target, type]) => {
    const a = byId.get(source);
    const b = byId.get(target);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const cx = a.x + dx * 0.5 - dy * 0.08;
    const cy = a.y + dy * 0.5 + dx * 0.08;
    const isRelated = selected && (source === selected || target === selected);
    path.setAttribute('d', `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`);
    path.setAttribute('class', `graph-link is-${type} ${isRelated ? 'is-related' : ''} ${selected && !isRelated ? 'is-muted' : ''}`);
    linkLayer.appendChild(path);
  });

  nodeLayer.innerHTML = '';
  visible.forEach((op) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const muted = selected && op.id !== selected && !related.has(op.id);
    group.setAttribute('class', `graph-node ${op.id === selected ? 'is-selected' : ''} ${muted ? 'is-muted' : ''}`);
    group.setAttribute('transform', `translate(${op.x} ${op.y})`);
    group.style.setProperty('--node-color', categories[op.category].color);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const shortName = op.apiName.replace(/^aclnn/, '');
    circle.setAttribute('r', shortName.length > 11 ? '44' : '38');
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.textContent = shortName.length > 12 ? `${shortName.slice(0, 11)}…` : shortName;
    group.append(circle, label);
    group.addEventListener('click', (event) => { event.stopPropagation(); selectOperator(op.id); });
    group.addEventListener('pointerenter', (event) => showTooltip(event, op));
    group.addEventListener('pointermove', moveTooltip);
    group.addEventListener('pointerleave', hideTooltip);
    nodeLayer.appendChild(group);
  });

  document.querySelector('#visible-count').textContent = `${visible.length} 个可见算子`;
  document.querySelector('#stat-nodes').textContent = operators.length;
  document.querySelector('#stat-links').textContent = links.length;
}

function showTooltip(event, op) { tooltip.hidden = false; tooltip.innerHTML = `<strong>${op.apiName}</strong><br>${categories[op.category].label} / ${op.repo}`; moveTooltip(event); }
function moveTooltip(event) { const host = graphSvg.getBoundingClientRect(); tooltip.style.left = `${event.clientX - host.left + 14}px`; tooltip.style.top = `${event.clientY - host.top + 14}px`; }
function hideTooltip() { tooltip.hidden = true; }


function renderInspector() {
  const op = state.selected ? byId.get(state.selected) : null;
  document.querySelector('#selected-meta').textContent = op
    ? categories[op.category].label
    : '未选择';

  if (!op) {
    inspector.innerHTML = renderEmptyInspector();
    return;
  }

  const profile = profileFor(op);
  const incoming = links.filter(([, target]) => target === op.id).length;
  const outgoing = links.filter(([source]) => source === op.id).length;
  const model = buildInspectorModel({
    op,
    category: categories[op.category],
    profile,
    incoming,
    outgoing,
  });

  inspector.innerHTML = renderInspectorView(model, state.inspectorTab);
}

function renderEdgeTable() {
  const visibleIds = new Set(visibleOperators().map((op) => op.id));
  const rows = visibleLinks(visibleIds);
  document.querySelector('#edge-meta').textContent = `${rows.length} 条可见关系`;
  edgeBody.innerHTML = rows.map(([source, target, type, meaning]) => `<tr><td><code>${source}</code></td><td><span class="operator-badge">${type}</span></td><td><code>${target}</code></td><td>${meaning}</td></tr>`).join('');
}
function render() {
  renderCategories();
  renderGraph();
  updateCenterHeader();
  renderInspector();
  renderEdgeTable();
  requestAnimationFrame(() => {
    explorerScrollIndicator.update();
    inspectorScrollIndicator.update();
    edgeTableScrollIndicator.update();
  });
}

function setupPanZoom() {
  let drag = null;
  graphSvg.addEventListener('pointerdown', (event) => { if (event.target.closest?.('.graph-node')) return; drag = { x: event.clientX, y: event.clientY, tx: state.transform.x, ty: state.transform.y }; graphSvg.classList.add('is-panning'); graphSvg.setPointerCapture(event.pointerId); });
  graphSvg.addEventListener('pointermove', (event) => { if (!drag) return; state.transform.x = drag.tx + event.clientX - drag.x; state.transform.y = drag.ty + event.clientY - drag.y; applyTransform(); });
  graphSvg.addEventListener('pointerup', () => { drag = null; graphSvg.classList.remove('is-panning'); });
  graphSvg.addEventListener('wheel', (event) => { event.preventDefault(); state.transform.k = Math.max(0.45, Math.min(2.2, state.transform.k * (event.deltaY > 0 ? 0.92 : 1.08))); applyTransform(); }, { passive: false });
  graphSvg.addEventListener('click', () => selectOperator(null));
}

function setupFrameCursor() { const frame = document.querySelector('.operator-frame'); frame.addEventListener('pointermove', (event) => { const rect = frame.getBoundingClientRect(); frame.style.setProperty('--ide-cursor-x', `${event.clientX - rect.left}px`); frame.style.setProperty('--ide-cursor-y', `${event.clientY - rect.top}px`); frame.style.setProperty('--ide-cursor-alpha', '0.13'); frame.style.setProperty('--ide-dot-opacity', '0.28'); }); frame.addEventListener('pointerleave', () => { frame.style.setProperty('--ide-cursor-alpha', '0'); frame.style.setProperty('--ide-dot-opacity', '0'); }); }

searchInput.addEventListener('input', (event) => { state.query = event.target.value; if (state.query.trim()) state.activeCategory = null; const first = visibleOperators()[0]; state.selected = first ? first.id : null; render(); requestAnimationFrame(fitGraph); });
fitGraphButton.addEventListener('click', fitGraph);
document.querySelector('#toggle-inspector').addEventListener('click', (event) => { const pane = document.querySelector('#operator-inspector-pane'); const hidden = !pane.hidden; pane.hidden = hidden; pane.setAttribute('aria-hidden', String(hidden)); event.currentTarget.classList.toggle('is-selected', !hidden); event.currentTarget.setAttribute('aria-pressed', String(!hidden)); });
window.addEventListener('resize', fitGraph);
setupPanZoom(); setupFrameCursor(); render(); requestAnimationFrame(fitGraph);


