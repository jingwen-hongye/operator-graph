# Operator Tree and Graph Colors Design

## Goal

Improve the local CANN operator graph sample so the left explorer demonstrates a realistic operator classification hierarchy and the center graph uses the shared PTO semantic visualization palette.

This remains a representative demo. It does not attempt to enumerate every CANN operator.

## Left Explorer

Replace the flat category filter list with an expandable tree:

1. Interface family, such as `Operator APIs (aclnn)`.
2. Operator category, such as `Math APIs`.
3. Optional list entry, such as `Math operator list`, followed by operator leaves.

The sample contains approximately 25 to 30 operators. Each category contributes three to five distinct operators. The initial categories are Math, Activation, Normalization, Attention, Matrix, and Quantization.

Categories and interface-family rows use compact tree controls with disclosure icons and counts. Operator leaves use a restrained card-like hover treatment. The selected leaf uses the PTO selected-state surface instead of a custom decorative frame.

## Interaction

- Clicking a disclosure control expands or collapses that branch.
- Clicking a category selects that category and shows its operators and relationships in the graph.
- Clicking an operator leaf selects the matching graph node and updates the inspector.
- Clicking a graph node selects and reveals the matching leaf in the tree.
- Search filters operators while preserving enough ancestor context to understand the hierarchy.
- At least one category remains visible in the graph.

## Graph Styling

Nodes remain circular, as requested.

Node colors follow the semantic palette used by `design-system-share` / PTO `model-graphviz`:

- Math: embedding/utility green-teal
- Activation: activation violet
- Normalization: normalization cyan
- Attention: attention blue
- Matrix: linear indigo
- Quantization: gate/compute amber-orange

Colors encode operator category and are the documented data-visualization exception. Graph background, labels, panels, hover states, and other UI colors remain token-derived.

Edges use a restrained neutral base. Selection increases the opacity of connected edges and dims unrelated nodes and edges. The selected circular node receives a white stroke, matching the shared graph selection convention. Node labels remain readable at the default fitted zoom.

## Data Model

Each operator record contains:

- stable ID and display API name
- interface family
- category
- graph position
- description, formula, parameters, and repository path
- optional detailed profile used by the inspector

The tree and graph are rendered from the same operator records so selection cannot drift between views.

## Verification

- Automated DOM/data tests verify hierarchy rendering, representative category counts, expansion, category selection, operator selection, and search ancestry.
- JavaScript syntax validation must pass.
- Browser verification checks desktop layout, tree scrolling, circular node colors, selected-state contrast, graph fit, and tree/graph/inspector synchronization.
- PTO container residue and typography audits are run when their local tools are available.
