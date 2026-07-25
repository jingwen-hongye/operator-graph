# Operator Graph And Support Matrix Views

## Goal

Add two switchable views to the center editor pane:

- 算子图谱
- 支持矩阵

The graph remains the default view. Both views share the current operator
filter, search query, selected operator, and inspector state.

## Reference

The support matrix structure is adapted from:

`compute-graph-viewer/Ascend operator matrix/ascend-operator-matrix_V2.html`

Only the matrix information architecture is reused. The reference page shell,
private colors, card decoration, and drawer are not copied.

## Architecture

### Center View State

Add `centerView` to the existing application state with two valid values:

- `graph`
- `matrix`

The initial value is `graph`. Switching views does not reset:

- selected operator
- active category
- search query
- graph pan and zoom transform
- active inspector tab

### Shared Data

The matrix uses the existing operator list and the inspector support model.
Hardware columns are fixed to:

- Atlas A2
- Ascend A3
- Ascend A5

Each matrix cell displays:

- full, partial, or adapting status
- primary supported data types

Support values remain deterministic demo data and use the same source as the
right-side support tab. No duplicate hardware status generator is introduced.

### View Renderer

Create a focused matrix renderer module responsible for:

- producing accessible matrix markup
- mapping support status to glyph and Simplified Chinese label
- exposing click binding for operator rows and hardware cells
- rendering a useful empty state

The renderer receives prepared view data and does not own global application
state.

## Interaction

The center tab strip contains:

- 算子图谱
- 支持矩阵

The selected tab uses the existing PTO `tab-control` selected state.

Clicking an operator name or support cell:

1. selects the operator
2. expands and scrolls the matching Explorer tree path
3. updates the right-side operator inspector
4. preserves the current center view

Search and category selection update both views from the same
`visibleOperators()` result.

When the matrix is shown:

- graph pointer and wheel handlers do not act on the hidden view
- the matrix supports local horizontal and vertical scrolling
- the current operator row uses the shared selected-state fill

When the graph is shown again, its previous pan and zoom transform is restored.

## Layout And PTO Mapping

The existing `ide-frame` shell and pane arrangement remain unchanged.
The center pane body becomes a view host containing two sibling views. Only one
view is visible at a time.

| Reference element | PTO implementation | Shared source | Removed legacy decoration |
|---|---|---|---|
| Matrix page shell | Existing center editor pane | `patterns/ide-frame` | Separate page shell |
| Graph/list switch | Center `tab-control` | PTO tab classes | Private toggle buttons |
| Hardware headers | Sticky table header | PTO typography and surfaces | Branded header blocks |
| Support cells | Glyph, label, data types | semantic status tokens | Saturated cell backgrounds |
| Selected operator | Selected row fill | `--state-selected` | Left accent rail |
| Matrix frame | Unframed pane view | pane boundary | Card shadow and rounded shell |

The matrix uses subtle table separators only. It does not introduce nested
cards, gradients, private shadows, or a second inspector drawer.

## Responsive Behavior

- The matrix keeps a stable minimum width and scrolls horizontally inside the
  center pane.
- Operator names remain visible using a sticky first column.
- Hardware headers remain visible during vertical scrolling.
- Labels stay at PTO-supported UI sizes; content is not scaled down.
- At narrow widths, status text may wrap below the glyph, while the matrix
  geometry remains stable.

## Accessibility

- The center tab strip uses `role="tablist"` and each tab uses `role="tab"`.
- Each view is a `role="tabpanel"` with matching `aria-controls`.
- Matrix operator and support cells are keyboard-focusable buttons.
- Support status is conveyed by both glyph and text, not color alone.
- Hidden views use the `hidden` attribute.

## Testing

Add focused tests for:

- matrix data built for every visible operator and all three hardware columns
- consistent support values between matrix and inspector
- matrix markup, status labels, empty state, and safe escaping
- center tab integration and state preservation
- matrix selection updating the shared selected operator
- required PTO matrix selectors and local overflow behavior

Run the full existing test suite after integration.

## Out Of Scope

- Copying the reference Demo model/version filters
- Adding new operators solely for the matrix
- Live hardware benchmark data
- Sorting or editing matrix cells
- Replacing the existing bottom dependency table
- A separate route or page for the matrix
