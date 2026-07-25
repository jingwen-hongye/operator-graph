# Scroll Indicator and Simplified Chinese Design

## Goal

Refine the operator graph demo with a compact vertical scroll indicator in the Explorer and convert user-facing natural-language content to Simplified Chinese.

## Explorer Scroll Indicator

- Apply only to the left Explorer scroll container.
- Hide the native scrollbar while preserving wheel, touchpad, keyboard, and programmatic scrolling.
- Render a custom vertical pill that is exactly 2px wide and 48px high.
- Position the pill 5px from the right edge, inside the Explorer content area.
- Use a token-derived neutral gray with low opacity at rest and stronger opacity while scrolling or hovering the Explorer.
- Move the pill between the top and bottom in proportion to `scrollTop / (scrollHeight - clientHeight)`.
- Hide the pill when the Explorer content does not overflow.
- Recalculate after tree expand/collapse, search filtering, pane resizing, and window resizing.

## Simplified Chinese Scope

Translate user-facing interface chrome and natural-language content:

- page, pane, section, table, and statistic titles;
- search placeholder, tooltips, empty states, status text, and interaction hints;
- category labels and list labels;
- operator descriptions, parameter descriptions, relationship meanings, and metadata labels.

Keep technical identifiers in English:

- operator API names such as `aclnnAdd`;
- formulas, parameter names, data types, code prototypes, file and repository paths;
- relation identifiers such as `variant`, `l0op_call`, and `microapi`;
- framework and platform product names.

## Interaction and Accessibility

The custom indicator is decorative and uses `aria-hidden="true"`. The Explorer remains the actual scroll container, so existing keyboard and assistive-technology behavior is unchanged. The indicator does not capture pointer events.

## Verification

- Test the scroll-position calculation for top, middle, bottom, and no-overflow states.
- Verify all existing operator data, tree, search, and semantic palette tests continue to pass.
- Validate JavaScript syntax.
- In the browser, expand and collapse categories, scroll to the bottom, search for an operator, and resize the Explorer.
- Confirm that natural-language UI text is Simplified Chinese while technical identifiers remain unchanged.
