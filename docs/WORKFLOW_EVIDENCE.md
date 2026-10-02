# Workflow evidence adapter

Status: independently executable technical evidence adapter and read-only file
audit, separate from acquisition, Catalog approval and publication. It does not
run media tools, scan channels, change Work State, or publish data. Existing local
extraction/ASR tooling remains authoritative.

## Manifest and index mapping

`gomyaku/workflow` exports `validateWorkflowEvidence`, `compileWorkflowEvidence`
and `serializeWorkflowEvidence`, with TypeScript declarations. These operations
are pure and import only `gomyaku/core`. The schema-1 manifest has four arrays:

| Input | Mapping / responsibility |
|---|---|
| `sources: [{id, durationMs?}]` | Explicit native clocks. Duration is declared, not measured here. |
| `artifacts: [{id, sourceId, path, sha256, byteCount, parents?}]` | Unanchored artifact nodes; parent artifact IDs become references. File identity stays in the workflow envelope. |
| `segments: [{id, artifactId, startMs, endMs?}]` | References the supporting artifact; uses its declared source clock for the anchor. |
| `paths: [{id, nodeIds}]` | Explicit ordered paths, preserving repetitions and authored order. |

No IDs are generated, truncated or rebased. Artifact and segment IDs share the
Core node namespace; parents must resolve to artifacts and their derivation
graph must be acyclic. This workflow constraint does not prohibit general graph
cycles in Core. Timings and closure follow Core validation. No timestamps,
cross-source synchronization, media durations or transcription text are inferred.

`compileWorkflowEvidence` returns `{schemaVersion:1, index, artifacts}`. Index
metadata contains only the technical node kind; it contains no file locators,
digest, private transcript, provider metadata or publication state. Artifact
descriptors retain declared paths, digests, counts and parent identities in the
separate envelope. Unknown input fields are ignored, not exported. Serialization
is deterministic under unordered collection/parent permutations; path order
remains significant. Compilation does not certify that a file exists.

Artifact paths use `/` and are relative to an explicit evidence root. Absolute
paths, drive-relative paths, URLs, traversal, ambiguous components and Windows
device/illegal filenames are rejected. Filesystem case sensitivity and filename
normalization still belong to the supplied workspace; no aliasing is inferred.

## Read-only byte evidence

`verifyWorkflowFiles(input, {root})` comes from the separate Node-only
`gomyaku/workflow/files` export. An absent root is `not-run`, an unavailable or
non-directory root is `unavailable`; both have `valid:false` and `checked:0`.
With a root, every artifact is checked, including failures. Each path is resolved
and checked against the real root before opening; directories and escaping
symlinks/junctions fail. SHA256 and byte count are computed by streaming the file;
an observed size/mtime change during the read also fails. Results carry per-file
`verified`/`failed`, observed identity and failures, with no absolute root.
The report's `manifestSha256` binds those results to the canonical serialized
workflow projection, including declared clocks, segments and expected file identity.
Changing a declared anchor therefore changes the binding even when file bytes match.

These results are a point-in-time byte identity audit, not a persistent lock or
a hostile-writer isolation guarantee. A successful audit does not certify
decodability, duration, alignment, subtitle quality, source rights, editorial
claims, or publication readiness. Empty input can check zero files successfully;
that does not demonstrate a media-processing pipeline. The workflow envelope
and reports remain local technical evidence; export policy belongs to the caller.

## Executable offline slice

The checked-in example uses only three fictional text files, two declared clocks
and two segments. Hash bytes are pinned to LF across operating systems:

```powershell
npm run workflow -- compile --input tests/fixtures/workflow/evidence.json
npm run workflow -- verify --input tests/fixtures/workflow/evidence.json --root tests/fixtures/workflow
npm run test:workflow
npm run validate
```

The CLI imports no Catalog, Project, People, framework or publication module.
It writes JSON to stdout, or to an explicitly supplied `--out`; destinations
that alias the input are rejected. `verify` also rejects evidence destinations,
including hard links. `compile` does not have an evidence root, so the caller
must choose an output outside their evidence files. Exit 0 means successful compilation or valid
byte checking, 1 means invalid input/evidence or I/O failure, 2 means invalid CLI
usage. `compile` rejects `--root` to avoid implying file verification.

Tests exercise real synthetic bytes, corrupt/missing/directory evidence,
escaping links, malformed paths/identities/times/derivation, input immutability,
deterministic output, declarations and a detached CLI with only Core and Workflow
files. No real RAW, ASR, channel inventory or publication corpus is a fixture.

## Remaining integration

Acquisition receipts still describe planned artifact coverage and evidence paths;
their `completed` status is not converted into a verified workflow artifact.
Legacy Source Set hash/line/arc validation is unchanged. Actual local-tool
receipts need an explicit adapter that supplies stable identity, declared native
clock, file digest and byte count; no approval or provenance is silently inferred.
Media probing and real processing acceptance are separate subsequent gates.
This release is an executable indexing/evidence slice, not a complete portable
media-processing pipeline.
