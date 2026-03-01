# Core — Shared Engine

Shared utilities and modules used across multiple lifeforms.

## Usage

Reference modules directly via relative `<script>` tags in each lifeform's `index.html`:

```html
<script src="../../core/js/pin-grid.js"></script>
```

## Modules

_Empty — modules will be extracted from individual lifeforms as shared patterns emerge across 2+ lifeforms._

## Extraction policy

Only move code here when:
1. Two or more lifeforms need the same behaviour
2. The interface is stable and well-defined

Premature extraction creates coupling without benefit. Keep lifeforms self-contained until patterns are proven.
