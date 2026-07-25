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
