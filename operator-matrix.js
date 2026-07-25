(function exposeOperatorMatrix(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OperatorMatrixView = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildApi() {
  const HARDWARE_IDS = ['a2', 'a3', 'a5'];
  const HARDWARE_NAMES = ['Atlas A2', 'Ascend A3', 'Ascend A5'];
  const STATUS = {
    full: { glyph: '●', label: '完全支持' },
    partial: { glyph: '◐', label: '部分支持' },
    adapting: { glyph: '–', label: '适配中' },
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function buildMatrixModel(operators, getInspectorModel) {
    const rows = operators.map((op) => {
      const inspector = getInspectorModel(op);
      return {
        id: op.id,
        apiName: op.apiName,
        category: inspector.summary.category,
        categoryColor: inspector.summary.categoryColor || '',
        hardware: inspector.support.hardware.map((item) => ({ ...item })),
      };
    });
    const hardware = rows[0]
      ? rows[0].hardware.map(({ id, name }) => ({ id, name }))
      : HARDWARE_IDS.map((id, index) => ({ id, name: HARDWARE_NAMES[index] }));

    return { hardware, rows };
  }

  function renderMatrixEmpty() {
    return `<div class="operator-matrix-empty">
      <h3>没有匹配的算子</h3>
      <p>请调整左侧分类或搜索条件。</p>
    </div>`;
  }

  function renderMatrix(model, selectedId = null) {
    if (!model.rows.length) return renderMatrixEmpty();

    const headers = model.hardware.map((item) => (
      `<th scope="col">
        <strong>${escapeHtml(item.name)}</strong>
        <span>训练 / 推理</span>
      </th>`
    )).join('');
    const rows = model.rows.map((row) => {
      const cells = row.hardware.map((item) => {
        const status = STATUS[item.status] || STATUS.adapting;
        const dtypes = item.dtypes.length ? item.dtypes.join(' / ') : '待确认';
        return `<td>
          <button type="button"
            class="operator-matrix-cell"
            data-matrix-operator="${escapeHtml(row.id)}"
            data-matrix-hardware="${escapeHtml(item.id)}"
            aria-label="${escapeHtml(`${row.apiName} 在 ${item.name}：${status.label}`)}">
            <span class="operator-matrix-status is-${escapeHtml(item.status)}">
              <span aria-hidden="true">${status.glyph}</span>${status.label}
            </span>
            <span class="operator-matrix-dtypes">${escapeHtml(dtypes)}</span>
          </button>
        </td>`;
      }).join('');
      const dotStyle = row.categoryColor
        ? ` style="--dot-color:${escapeHtml(row.categoryColor)}"`
        : '';
      return `<tr class="${row.id === selectedId ? 'is-selected' : ''}">
        <th class="operator-matrix-operator" scope="row">
          <button type="button"
            data-matrix-operator="${escapeHtml(row.id)}"
            aria-label="查看 ${escapeHtml(row.apiName)} 详情">
            <span class="operator-matrix-dot"${dotStyle}></span>
            <span class="operator-matrix-operator-meta">
              <strong>${escapeHtml(row.apiName)}</strong>
              <small>${escapeHtml(row.category)}</small>
            </span>
          </button>
        </th>
        ${cells}
      </tr>`;
    }).join('');

    return `<table class="operator-matrix-table">
      <thead>
        <tr>
          <th class="operator-matrix-corner" scope="col">算子 / 硬件</th>
          ${headers}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function bindMatrixSelection(rootElement, onSelect) {
    const handleClick = (event) => {
      const target = event.target.closest?.('[data-matrix-operator]');
      if (!target || !rootElement.contains(target)) return;
      onSelect(
        target.dataset.matrixOperator,
        target.dataset.matrixHardware || null,
      );
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
