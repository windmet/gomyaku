# Catalog query contract v0.1

`queryCatalog` is the authoring-side selection seam between a Catalog Snapshot
and an explicit acquisition or Project decision. It reads three separate
layers and never mutates them:

```text
items.jsonl            stable provider metadata
classifications.jsonl  editorial classification
work-state.jsonl       local production state
```

Supported filters are provider, availability, date range, primary category,
series, game, format, person, free-text search, audio status, transcript
status, Project status, and publication candidate. A missing classification or
Work State entry does not delete the Media Item; it simply fails a filter that
requires that value.

Results are deterministic: published date descending, then stable Media Item
ID ascending. The result contains `{ query, total, matched, rows }`, where each
row keeps the item, classification and Work State in separate fields. A
Markdown renderer is a human view only; JSONL remains authoritative.

The CLI is read-only by default:

```text
gomyaku catalog query --workspace <path> --category radio
gomyaku catalog query --workspace <path> --transcript-status missing --format-out markdown
```

`--out` may write an explicit report, but the command never downloads media,
changes Work State, or creates a Project.
