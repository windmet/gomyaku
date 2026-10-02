# Index Core boundary

Status: first independently executable core, additive to the existing API.
Import `compileIndex`, `validateIndex`, or `serializeIndex` from `gomyaku/core`.
The entrypoint has accompanying TypeScript declarations and no runtime imports.

## Input

```js
const index = {
  schemaVersion: 1,
  sources: [{ id: 'recording', durationMs: 60000 }],
  nodes: [
    { id: 'topic', references: [], anchors: [], data: { label: 'Example' } },
    { id: 'excerpt', references: ['topic'],
      anchors: [{ sourceId: 'recording', startMs: 1000, endMs: 5000 }] },
  ],
  paths: [{ id: 'reading-order', nodeIds: ['topic', 'excerpt'] }],
};
```

IDs are nonempty strings without surrounding whitespace, unique within each
collection. Node references and path entries must resolve to nodes; anchors
must resolve to sources. Times are nonnegative safe integer milliseconds in
the named source's native clock. End times may equal start times; omitted end
means a point. If a source duration is supplied, anchors must stay within it.
No cross-source synchronization is inferred. No presence or publication status
is required. Empty collections, unanchored nodes, graph cycles and repeated
path entries are valid.

`data` is consumer-owned finite, acyclic JSON. Core does not interpret it.
The compiler selects only documented envelope fields; custom fields belong
inside `data`. It does not inspect metadata for publication/privacy policy:
publishing or exporting metadata remains the consumer's responsibility.

## Output and failure

`validateIndex(unknown)` returns `{ valid, failures: [{ path, message }] }`.
`compileIndex(input)` rejects invalid input with an Error and otherwise returns
a detached normalized index plus `reverseReferences`, `pathMembership` and
one timeline per source. There is no partial success or filesystem mutation.

Collection IDs, references and metadata keys use deterministic code-unit
ordering. References are deduplicated; anchors retain multiplicity. Paths
retain their authored node order and repetitions. Timelines sort by native
time, explicit/omitted end, then node ID. `serializeIndex` returns canonical
JSON followed by a newline; source/node collection order and metadata key
insertion order do not change those bytes.

## Ownership and migration

Qianqingtie owns birthday scope, People/Mentions/Credits roles, Related,
Storylines, tags, Reader behavior and publication validation. Those concepts
are not required by this core. Technical media artifacts will be an adapter
input, not automatically published facts.

The Project-v1 compiler, schema factories, People projections, source-set and
Catalog APIs remain compatible while consumers migrate. This change does not
remove their validators or redirect old imports. The [workflow evidence adapter](WORKFLOW_EVIDENCE.md)
now has pure projection, read-only byte verification and an independently executable
offline CLI. The existing audio-ASR receipt dialect can be projected through
explicit artifact/clock bindings, independently of receipt completion claims.
Publication consumption remains a separate consumer-owned adapter; actual
workspace bindings and real media acceptance are still pending.
New entrypoints alone are not completion of that migration.

Tests use synthetic data, validate malformed references and timing, preserve
authored order, check byte determinism, and copy the standalone module into a
temporary directory to prove independence from the package and workspace.
