(function exposeOperatorTree(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.OperatorTree = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function buildOperatorTreeApi() {
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
          children: category.children
            .map((list) => ({
              ...list,
              children: list.children.filter((operator) => (
                [
                  operator.apiName,
                  operator.id,
                  operator.description,
                  operator.repo,
                  category.label,
                ].some((value) => value.toLowerCase().includes(normalized))
              )),
            }))
            .filter((list) => list.children.length),
        }))
        .filter((category) => category.children.length),
    };
  }

  return { buildTree, filterTree };
}));
