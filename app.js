const { categories, operators, links } = window.OperatorDemoData;
const { buildTree, filterTree } = window.OperatorTree;
const operatorTree = buildTree(categories, operators);

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
  transform: { x: 0, y: 0, k: 1 },
};
const byId = new Map(operators.map((op) => [op.id, op]));
const graphSvg = document.querySelector('#operator-graph');
const viewport = document.querySelector('#graph-viewport');
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

function visibleOperators() {
  const query = state.query.trim().toLowerCase();
  return operators.filter((op) => (
    (!state.activeCategory || op.category === state.activeCategory)
    && (!query || [op.apiName, op.id, op.category, op.description, op.repo]
      .some((text) => text.toLowerCase().includes(query)))
  ));
}
function visibleLinks(visibleIds) { return links.filter(([source, target]) => visibleIds.has(source) && visibleIds.has(target)); }
function applyTransform() { viewport.setAttribute('transform', `translate(${state.transform.x} ${state.transform.y}) scale(${state.transform.k})`); document.querySelector('#graph-readout').textContent = `缩放 ${(state.transform.k * 100).toFixed(0)}%`; }
function fitGraph() { const box = graphSvg.getBoundingClientRect(); state.transform = { x: box.width / 2, y: box.height / 2, k: Math.min(box.width / 1160, box.height / 860) }; applyTransform(); }
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
function fact(label, value) { return `<div class="operator-fact"><span>${label}</span><strong>${value}</strong></div>`; }
function chips(items) { return `<span class="operator-chip-wrap">${items.map((item) => `<span class="operator-badge">${item}</span>`).join('')}</span>`; }

function deterministicLabel(value) {
  if (value === 'Yes') return '是';
  if (value === 'No') return '否';
  return '条件支持';
}

function renderInspector() {
  const op = state.selected ? byId.get(state.selected) : null;
  document.querySelector('#selected-meta').textContent = op
    ? categories[op.category].label
    : '未选择';

  if (!op) {
    inspector.innerHTML = `<section class="inspector-section"><div class="operator-inspector-title"><h2>未选择算子</h2><p class="operator-description">点击图谱节点，或通过搜索定位算子，即可查看计算公式、参数、平台、框架、API 映射、算子原型、Golden 数据及确定性支持情况。</p></div></section><section class="inspector-section"><div class="inspector-soft-card"><p class="operator-soft-note">此本地演示使用模拟的 CANN 算子数据。界面采用 PTO ide-frame；后续可将图谱数据替换为 FastAPI /api/graph 的响应。</p></div></section>`;
    return;
  }

  const profile = profileFor(op);
  const incoming = links.filter(([, target]) => target === op.id).length;
  const outgoing = links.filter(([source]) => source === op.id).length;
  const deterministicClass = profile.deterministic === 'Yes' ? 'is-success' : 'is-warning';

  inspector.innerHTML = `<section class="inspector-section"><div class="operator-inspector-title"><h2>${op.apiName}</h2><div class="operator-badge-row"><span class="operator-badge">${categories[op.category].label}</span><span class="operator-badge">${profile.computeType}</span><span class="operator-badge is-success">${op.formulas.length} 个公式</span><span class="operator-badge is-warning">${incoming} 入 / ${outgoing} 出</span></div><p class="operator-description">${op.description}</p></div></section><section class="inspector-section"><div class="inspector-section-head"><span class="inspector-section-title">算子概览</span><span class="inspector-section-kicker">元数据</span></div><div class="operator-fact-grid">${fact('算子名称', op.apiName)}${fact('计算类型', profile.computeType)}${fact('功能描述', op.description)}${fact('支持平台', chips(profile.platforms))}${fact('支持框架', chips(profile.frameworks))}${fact('是否支持确定性', `<span class="operator-badge ${deterministicClass}">${deterministicLabel(profile.deterministic)}</span>`)}${fact('支持数据类型', chips(profile.dtypes))}</div></section><section class="inspector-section"><div class="inspector-section-head"><span class="inspector-section-title">计算公式</span><span class="inspector-section-kicker">${op.formulas.length} 个公式</span></div><div class="inspector-soft-card"><code>${op.formulas[0]}</code></div></section><section class="inspector-section"><div class="inspector-section-head"><span class="inspector-section-title">关联 API 与算子原型</span><span class="inspector-section-kicker">API / Prototype</span></div><div class="operator-api-list">${profile.api.map((api) => `<span class="operator-badge">${api}</span>`).join('')}</div><div class="inspector-soft-card operator-code-card"><code>${profile.prototype}</code></div></section><section class="inspector-section"><div class="inspector-section-head"><span class="inspector-section-title">参数</span><span class="inspector-section-kicker">${op.params.length} 个字段</span></div><div class="operator-param-list">${op.params.map(([name, type, desc]) => `<div class="operator-param-row"><strong>${name}</strong><code>${type}</code><span>${desc}</span></div>`).join('')}</div></section><section class="inspector-section"><div class="inspector-section-head"><span class="inspector-section-title">Golden 数据</span><span class="inspector-section-kicker">校验基准</span></div><div class="operator-fact-grid">${fact('Golden 路径', `<code>${profile.golden}</code>`)}${fact('校验口径', 'shape / dtype / absolute error / relative error')}${fact('源码路径', `<code>${op.repo}</code>`)}</div></section>`;
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
document.querySelector('#fit-graph').addEventListener('click', fitGraph);
document.querySelector('#toggle-inspector').addEventListener('click', (event) => { const pane = document.querySelector('#operator-inspector-pane'); const hidden = !pane.hidden; pane.hidden = hidden; pane.setAttribute('aria-hidden', String(hidden)); event.currentTarget.classList.toggle('is-selected', !hidden); event.currentTarget.setAttribute('aria-pressed', String(!hidden)); });
window.addEventListener('resize', fitGraph);
setupPanZoom(); setupFrameCursor(); render(); requestAnimationFrame(fitGraph);


