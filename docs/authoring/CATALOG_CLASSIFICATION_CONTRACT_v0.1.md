# Catalog classification contract v0.1

Classification is a rerunnable editorial layer over stable Media Items. It never mutates `items.jsonl`.

```text
items.jsonl
  + rules.yaml
  + overrides.yaml
      ↓
classifications.jsonl
  + generated/classification-diff.json
```

## Rules

- Rules are generic workspace data, not committed real-channel taxonomy.
- Higher numeric priority wins for scalar fields.
- Different scalar values at the same priority produce `source: conflict`; they are not silently resolved.
- Additive fields (`format`, `people`, `topics`, `tags`) are deterministically deduplicated.

## Overrides

- A reviewed override wins over rules and resolves rule conflict for that item.
- Every override requires a non-empty reason.
- An override referencing an unknown Media Item fails the run.

## Diff

Every rerun reports `NEW`, `CHANGED`, and `UNCHANGED`, plus conflict, unclassified, and override totals. Repeating the same inputs must produce no diff.

The current `.yaml` files use JSON-compatible YAML syntax so the core has no YAML runtime dependency. AI classification is not part of this contract.
