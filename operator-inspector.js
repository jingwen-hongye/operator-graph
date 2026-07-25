(function exposeOperatorInspectorView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OperatorInspectorView = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildApi() {
  const TABS = [
    { id: 'definition', label: '算子定义' },
    { id: 'support', label: '支持情况' },
    { id: 'performance', label: '性能' },
    { id: 'precision', label: '精度' },
    { id: 'api', label: 'API 学习' },
  ];

  const STATUS = {
    full: { glyph: '●', label: '满支持' },
    partial: { glyph: '◐', label: '部分支持' },
    adapting: { glyph: '—', label: '适配中' },
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeTab(tab) {
    return TABS.some((item) => item.id === tab) ? tab : 'definition';
  }

  function renderBadges(items) {
    return `<span class="operator-chip-wrap">${items
      .map((item) => `<span class="operator-badge">${escapeHtml(item)}</span>`)
      .join('')}</span>`;
  }

  function renderTable(headers, rows, emptyMessage = '暂无示例数据') {
    if (!rows.length) {
      return `<p class="operator-detail-empty">${escapeHtml(emptyMessage)}</p>`;
    }
    return `<div class="operator-table-scroll"><table class="operator-detail-table"><thead><tr>${headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }

  function renderFields(title, fields) {
    const rows = fields.map((field) => `<tr>
      <td><code>${escapeHtml(field.name)}</code></td>
      <td><code>${escapeHtml(field.shape)}</code></td>
      <td><code>${escapeHtml(field.dtype)}</code></td>
      <td>${escapeHtml(field.description)}</td>
    </tr>`);
    return `<section class="operator-detail-section">
      <h3>${escapeHtml(title)}</h3>
      ${renderTable(['名称', '形状', '数据类型', '说明'], rows)}
    </section>`;
  }

  function renderDefinition(model) {
    const definition = model.definition;
    const formulas = definition.formulas.length
      ? definition.formulas.map((formula) => (
        `<div class="operator-code-block"><code>${escapeHtml(formula)}</code></div>`
      )).join('')
      : '<p class="operator-detail-empty">暂无示例数据</p>';
    return `<section class="operator-detail-section">
      <h3>功能描述</h3>
      <p>${escapeHtml(definition.description)}</p>
    </section>
    <section class="operator-detail-section">
      <h3>计算公式</h3>
      ${formulas}
    </section>
    ${renderFields('输入', definition.inputs)}
    ${renderFields('输出', definition.outputs)}
    ${renderFields('参数', definition.params)}`;
  }

  function renderSupport(model) {
    const rows = model.support.hardware.map((hardware) => {
      const status = STATUS[hardware.status] || STATUS.adapting;
      return `<div class="operator-support-row">
        <div class="operator-support-heading">
          <strong>${escapeHtml(hardware.name)}</strong>
          <span class="operator-support-status is-${escapeHtml(hardware.status)}">
            <span class="operator-status-glyph" aria-hidden="true">${status.glyph}</span>
            ${status.label}
          </span>
        </div>
        <div class="operator-support-meta">
          <span>数据类型</span>${renderBadges(hardware.dtypes)}
        </div>
        <ul class="operator-condition-list">${hardware.conditions
          .map((condition) => `<li>${escapeHtml(condition)}</li>`)
          .join('')}</ul>
      </div>`;
    }).join('');
    const deterministic = {
      Yes: '是',
      No: '否',
      Conditional: '条件支持',
    }[model.support.deterministic] || model.support.deterministic;

    return `<section class="operator-detail-section">
      <h3>硬件支持</h3>
      <div class="operator-support-list">${rows}</div>
    </section>
    <section class="operator-detail-section operator-support-summary">
      <h3>框架与确定性</h3>
      <div><span>支持框架</span>${renderBadges(model.support.frameworks)}</div>
      <div><span>确定性</span><strong>${escapeHtml(deterministic)}</strong></div>
    </section>`;
  }

  function renderPerformance(model) {
    const rows = model.performance.rows.map((row) => `<tr>
      <td>${escapeHtml(row.hardware)}</td>
      <td>${escapeHtml(row.metric)}</td>
      <td><code>${escapeHtml(row.dtype)}</code></td>
      <td>${Number(row.theoretical).toFixed(1)} ${escapeHtml(row.unit)}</td>
      <td>${Number(row.measured).toFixed(1)} ${escapeHtml(row.unit)}</td>
      <td>${(Number(row.utilization) * 100).toFixed(1)}%</td>
      <td>${Number(row.h100Measured).toFixed(1)} ${escapeHtml(row.unit)}</td>
      <td>${Number(row.ratio).toFixed(2)}×</td>
    </tr>`);
    return `<section class="operator-detail-section">
      <h3>硬件性能对比</h3>
      ${renderTable(
        ['硬件', '指标', '精度', '理论', '演示实测', '利用率', 'H100 实测', '对比'],
        rows,
      )}
      <p class="operator-demo-note">${escapeHtml(model.performance.note)}</p>
    </section>`;
  }

  function renderPrecision(model) {
    const rows = model.precision.rows.map((row) => `<tr>
      <td><code>${escapeHtml(row.dtype)}</code></td>
      <td><code>${escapeHtml(row.error)}</code></td>
      <td><code>${escapeHtml(row.cosine)}</code></td>
      <td><span class="operator-precision-grade">${escapeHtml(row.grade)}</span></td>
    </tr>`);
    return `<section class="operator-detail-section">
      <h3>精度基线</h3>
      ${renderTable(['数据类型', '最大相对误差', '余弦相似度', '评级'], rows)}
      <p class="operator-demo-note">${escapeHtml(model.precision.note)}</p>
    </section>`;
  }

  function renderApi(model) {
    const api = model.api;
    const paramRows = api.params.map((param) => `<tr>
      <td><code>${escapeHtml(param.name)}</code></td>
      <td><code>${escapeHtml(param.dtype)}</code></td>
      <td>${escapeHtml(param.description)}</td>
    </tr>`);
    return `<section class="operator-detail-section">
      <h3>ACLNN 接口</h3>
      <div class="operator-api-name"><code>${escapeHtml(api.name)}</code></div>
      <div class="operator-code-block"><code>${escapeHtml(api.prototype)}</code></div>
    </section>
    <section class="operator-detail-section">
      <h3>参数</h3>
      ${renderTable(['名称', '类型', '说明'], paramRows)}
    </section>
    <section class="operator-detail-section">
      <h3>调用步骤</h3>
      <ol class="operator-learning-steps">${api.steps
        .map((step) => `<li>${escapeHtml(step)}</li>`)
        .join('')}</ol>
    </section>
    <section class="operator-detail-section">
      <h3>Golden 数据</h3>
      <div class="operator-code-block"><code>${escapeHtml(api.golden)}</code></div>
    </section>
    <section class="operator-detail-section">
      <h3>学习链接</h3>
      <div class="operator-api-links">${api.links.map((link) => (
        `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`
      )).join('')}</div>
    </section>`;
  }

  function renderPanel(model, tab) {
    if (tab === 'support') return renderSupport(model);
    if (tab === 'performance') return renderPerformance(model);
    if (tab === 'precision') return renderPrecision(model);
    if (tab === 'api') return renderApi(model);
    return renderDefinition(model);
  }

  function renderInspector(model, activeTab = 'definition') {
    const tab = normalizeTab(activeTab);
    const summary = model.summary;
    const tabs = TABS.map((item) => {
      const selected = item.id === tab;
      return `<button class="tab-control-item${selected ? ' is-selected' : ''}"
        type="button"
        role="tab"
        data-inspector-tab="${item.id}"
        aria-selected="${selected}"
        aria-controls="operator-inspector-panel">${item.label}</button>`;
    }).join('');

    return `<section class="operator-inspector-summary">
      <div class="operator-inspector-title">
        <h2>${escapeHtml(summary.name)}</h2>
        <div class="operator-badge-row">
          <span class="operator-badge">${escapeHtml(summary.category)}</span>
          <span class="operator-badge">${escapeHtml(summary.computeType)}</span>
          <span class="operator-badge is-success">${summary.formulaCount} 个公式</span>
          <span class="operator-badge is-warning">${summary.incoming} 入 / ${summary.outgoing} 出</span>
        </div>
        <p class="operator-description">${escapeHtml(summary.description)}</p>
      </div>
    </section>
    <div class="operator-inspector-tabs tab-control" role="tablist" aria-label="算子详情">
      ${tabs}
    </div>
    <div class="operator-inspector-panel"
      id="operator-inspector-panel"
      role="tabpanel"
      data-inspector-panel="${tab}">
      ${renderPanel(model, tab)}
    </div>`;
  }

  function renderEmptyInspector() {
    return `<section class="operator-inspector-empty">
      <h2>未选择算子</h2>
      <p>点击图谱节点或左侧算子名称，查看算子定义、支持情况、性能、精度和 API 学习内容。</p>
    </section>`;
  }

  function bindInspectorTabs(rootElement, onSelect) {
    const handleClick = (event) => {
      const button = event.target.closest?.('[data-inspector-tab]');
      if (!button || !rootElement.contains(button)) return;
      onSelect(normalizeTab(button.dataset.inspectorTab));
    };
    rootElement.addEventListener('click', handleClick);
    return () => rootElement.removeEventListener('click', handleClick);
  }

  return {
    TABS,
    normalizeTab,
    renderInspector,
    renderEmptyInspector,
    bindInspectorTabs,
  };
}));
