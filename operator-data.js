(function exposeOperatorData(root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  root.OperatorDemoData = data;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildOperatorData() {
  const semanticPalette = {
    math: '#14B8A6',
    activation: '#8B5CF6',
    norm: '#0EA5E9',
    attention: '#3B82F6',
    matmul: '#4F46E5',
    quant: '#F59E0B',
  };
  const categories = {
    math: {
      id: 'math',
      label: '数学运算类接口',
      listLabel: '数学运算算子列表',
      color: semanticPalette.math,
      interfaceFamily: 'aclnn',
    },
    activation: {
      id: 'activation',
      label: '激活函数类接口',
      listLabel: '激活函数算子列表',
      color: semanticPalette.activation,
      interfaceFamily: 'aclnn',
    },
    norm: {
      id: 'norm',
      label: '归一化类接口',
      listLabel: '归一化算子列表',
      color: semanticPalette.norm,
      interfaceFamily: 'aclnn',
    },
    attention: {
      id: 'attention',
      label: '注意力类接口',
      listLabel: '注意力算子列表',
      color: semanticPalette.attention,
      interfaceFamily: 'aclnn',
    },
    matmul: {
      id: 'matmul',
      label: '矩阵计算类接口',
      listLabel: '矩阵计算算子列表',
      color: semanticPalette.matmul,
      interfaceFamily: 'aclnn',
    },
    quant: {
      id: 'quant',
      label: '量化类接口',
      listLabel: '量化算子列表',
      color: semanticPalette.quant,
      interfaceFamily: 'aclnn',
    },
  };

  function operator(id, apiName, category, x, y, description, formula) {
    return {
      id,
      apiName,
      category,
      x,
      y,
      description,
      formulas: [formula],
      params: [
        ['x', 'Tensor', '输入张量'],
        ['y', 'Tensor', '输出张量'],
      ],
      repo: `${category}/${id}`,
    };
  }

  const operators = [
    operator('abs', 'aclnnAbs', 'math', -460, -250, '计算输入张量中每个元素的绝对值。', 'y = |x|'),
    operator('add', 'aclnnAdd', 'math', -280, -270, '对张量逐元素相加，并支持广播。', 'y = x1 + alpha * x2'),
    operator('mul', 'aclnnMul', 'math', -100, -270, '对张量进行逐元素乘法。', 'y = x1 * x2'),
    operator('sub', 'aclnnSub', 'math', 80, -260, '对两个张量进行逐元素减法。', 'y = x1 - alpha * x2'),
    operator('reduce_sum', 'aclnnReduceSum', 'math', 260, -230, '沿指定维度对张量进行求和归约。', 'y = sum(x, axes)'),

    operator('relu', 'aclnnRelu', 'activation', -450, -80, '应用 ReLU 激活函数。', 'y = max(0, x)'),
    operator('gelu', 'aclnnGelu', 'activation', -270, -90, '应用 GELU 激活函数。', 'y = GELU(x)'),
    operator('sigmoid', 'aclnnSigmoid', 'activation', -90, -90, '使用 Sigmoid 将数值映射到零到一之间。', 'y = 1 / (1 + exp(-x))'),
    operator('silu', 'aclnnSilu', 'activation', 90, -80, '应用 SiLU 激活函数。', 'y = x * sigmoid(x)'),
    operator('softmax', 'aclnnSoftmax', 'activation', 280, -60, '沿指定轴将数值归一化为概率分布。', 'y_i = exp(x_i) / sum(exp(x_j))'),

    operator('layer_norm', 'aclnnLayerNorm', 'norm', -400, 100, '使用层级统计量对特征进行归一化。', 'y = gamma * normalize(x) + beta'),
    operator('rms_norm', 'aclnnRmsNorm', 'norm', -190, 100, '使用均方根对数值进行归一化。', 'y = x / RMS(x) * gamma'),
    operator('batch_norm', 'aclnnBatchNorm', 'norm', 20, 110, '使用运行统计量对批次数据进行归一化。', 'y = gamma * (x - mean) / sqrt(var + eps) + beta'),
    operator('group_norm', 'aclnnGroupNorm', 'norm', 230, 120, '按独立分组对通道进行归一化。', 'y = GroupNorm(x, groups)'),

    operator('flash_attention_score', 'aclnnFlashAttentionScore', 'attention', -350, 300, '计算训练场景下的融合注意力得分。', 'y = softmax(QK^T / sqrt(d))V'),
    operator('prompt_flash_attention', 'aclnnPromptFlashAttention', 'attention', -100, 300, '计算 Prompt 推理场景下的融合注意力。', 'y = PromptAttention(Q, K, V)'),
    operator('paged_attention', 'aclnnPagedAttention', 'attention', 150, 300, '基于分页 KV Cache 计算注意力。', 'y = Attention(Q, K_cache, V_cache)'),
    operator('incre_flash_attention', 'aclnnIncreFlashAttention', 'attention', 400, 300, '在解码阶段计算增量融合注意力。', 'y_t = Attention(Q_t, K_cache, V_cache)'),

    operator('matmul', 'aclnnMatmul', 'matmul', 460, -230, '执行二维矩阵乘法。', 'C = A x B'),
    operator('batch_matmul', 'aclnnBatchMatMul', 'matmul', 500, -70, '对批量数据执行矩阵乘法。', 'C_b = A_b x B_b'),
    operator('addmm', 'aclnnAddmm', 'matmul', 500, 90, '将输入张量与矩阵乘法结果相加。', 'y = beta * input + alpha * A x B'),
    operator('linear', 'aclnnLinear', 'matmul', 470, 250, '执行带可选偏置的线性投影。', 'y = xW^T + b'),

    operator('quant_matmul', 'aclnnQuantMatmul', 'quant', 20, 470, '对量化输入执行矩阵乘法。', 'C = dequant(A_q x B_q)'),
    operator('dequant', 'aclnnDequant', 'quant', 220, 470, '将量化数值恢复为更高精度。', 'y = scale * (x - offset)'),
    operator('quantize', 'aclnnQuantize', 'quant', 420, 470, '将浮点数值映射到量化范围。', 'y = round(x / scale) + offset'),
    operator('per_channel_quant', 'aclnnPerChannelQuant', 'quant', 620, 440, '使用各通道独立的缩放因子进行量化。', 'y_c = round(x_c / scale_c) + offset_c'),
  ];

  const links = [
    ['batch_matmul', 'matmul', 'variant', '批量矩阵乘法是基础矩阵计算的批处理变体。'],
    ['linear', 'matmul', 'l0op_call', '线性投影依赖矩阵乘法。'],
    ['addmm', 'add', 'l0op_call', 'AddMM 包含逐元素加法。'],
    ['addmm', 'matmul', 'l0op_call', 'AddMM 包含矩阵乘法。'],
    ['flash_attention_score', 'matmul', 'l0op_call', '注意力得分计算依赖矩阵乘法。'],
    ['flash_attention_score', 'softmax', 'l0op_call', '注意力概率通过 Softmax 进行归一化。'],
    ['prompt_flash_attention', 'flash_attention_score', 'variant', 'Prompt Attention 是面向推理场景的变体。'],
    ['paged_attention', 'flash_attention_score', 'variant', 'Paged Attention 是面向缓存的注意力变体。'],
    ['incre_flash_attention', 'flash_attention_score', 'variant', 'Incremental Attention 是面向解码阶段的变体。'],
    ['rms_norm', 'reduce_sum', 'l0op_call', 'RMS 计算依赖归约操作。'],
    ['layer_norm', 'reduce_sum', 'l0op_call', '层级统计量计算依赖归约操作。'],
    ['gelu', 'mul', 'l0op_call', 'GELU 近似计算依赖乘法。'],
    ['silu', 'sigmoid', 'l0op_call', 'SiLU 由 Sigmoid 与乘法组合实现。'],
    ['silu', 'mul', 'l0op_call', 'SiLU 将输入与 Sigmoid 结果相乘。'],
    ['quant_matmul', 'matmul', 'variant', '量化矩阵乘法保留基础矩阵计算语义。'],
    ['quant_matmul', 'dequant', 'l0op_call', '量化输出通过反量化恢复精度。'],
    ['per_channel_quant', 'quantize', 'variant', '逐通道量化是基础量化操作的特化形式。'],
  ];

  return { semanticPalette, categories, operators, links };
}));


