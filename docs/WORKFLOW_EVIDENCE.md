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

## Existing audio-ASR receipt dialect

`gomyaku/workflow/receipts` exports the pure `projectAudioAsrReceipt(receipt,
configuration)` adapter. It accepts `schemaVersion:1`,
`kind:"audio-asr-processing-receipt"` from existing local tooling, not Catalog
acquisition receipts. No local tool, filesystem, provider or publication import
is required. It returns a Workflow manifest, not a verification report.

The separate schema-1 configuration requires `sources`, `bindings`, `segments`
and `paths`. At least one binding must be explicitly selected. Each binding has
`{slot, id, sourceId, byteCount?, parents?}`. IDs, clocks, segments, ordered paths
and derivation parents are caller declarations; none is generated or inferred
from filenames, receipt timestamps, chunk names or media duration. Receipt
array positions select fields only and never become artifact IDs. Reordering a
receipt array requires reviewing its corresponding configuration.

| Selected path field (`slot`) | Expected digest | Expected byte count |
|---|---|---|
| `/sourceMedia/path` | `sourceMedia.sha256` | `sourceMedia.bytes` |
| `/m4a/masterPath` | `m4a.sha256` | `m4a.bytes` |
| `/whisper/deliverySrt` | `whisper.deliverySha256` | Explicit supplement |
| `/whisper/rawChunkOutputs/N/srt` | Selected entry's `srtSha256` | Explicit supplement |
| `/m4aChunks/N/path` | Selected entry's `sha256` | Selected entry's `bytes` |
| `/chat/rawPath`, `/chat/normalizedPath` | `rawSha256`, `normalizedSha256` | Explicit supplement |
| `/comments/infoPath`, `/comments/normalizedPath` | `infoSha256`, `normalizedSha256` | Explicit supplement |

`N` is a canonical nonnegative decimal array index; unsupported slots, repeated
slots, absent selected fields, missing hashes/counts, unsafe paths and invalid
Workflow closure fail. A count supplement may fill an absent receipt count;
it must not conflict with a count already present (including invalid/null
values). A binding cannot override the receipt path or hash. Supplements are
declared expectations supplied by the caller, not observed file sizes or
verified facts. Independent file checking compares the current bytes with those
expectations. In particular, the adapter never hashes a changed file to replace
its previously declared receipt digest.

Only explicitly selected artifacts are projected. Unselected receipt fields may
be absent; selection proves no full pipeline coverage. Cleanup candidates,
un-hashed MSST output declarations and Whisper JSON without a declared digest
are unsupported. Do not invent their expected identities to satisfy a gate.
Acquire or declare the missing evidence separately before indexing it.

Completion/status, decode results, human-review claims, title, URL, machine
paths, command lines, transcript, Catalog/Work State/publication scope and any
other metadata are not copied. Failed/partial receipts may still contain
selected evidence; selection makes no success claim. A byte audit must be run
separately and still proves neither decoding nor alignment, subtitle quality or
publication readiness.

```powershell
# The fixture contains fictional text, not playable media or real ASR.
npm run workflow -- receipt --input tests/fixtures/workflow/audio-asr-receipt.json --bindings tests/fixtures/workflow/audio-asr-bindings.json --out receipt-evidence.local.json
npm run workflow -- verify --input receipt-evidence.local.json --root tests/fixtures/workflow
```

The `receipt` command requires `--bindings` and rejects `--root`. Output uses
stdout by default; an explicit `--out` cannot overwrite either JSON input,
including aliases/hard links. Like `compile`, it has no evidence root: choose
output outside evidence files. The `.local.json` output is local evidence, not
publication data. Exit 0 means valid projection only; byte verification has its
own result and exit status. Detached CLI tests copy only Core and Workflow,
convert the synthetic receipt, verify its three real fixture files, reject
input overwrites, and show that changed bytes fail even for a completed receipt.

## Private local integration evidence

A separate local authoring audit has now exercised this release against one
existing audio-ASR receipt. All real input, bindings, reports, supplemental
counts and runner snapshots stay outside this repository and publication code;
they are not package fixtures or public corpus. Generic CI remains synthetic.

The audit independently matched 13 selected files to their historical receipt
digests, supplied 8 missing counts only after those digest matches, and checked
the final manifest again after media checks. Original receipt hashes were never
replaced. Supplemental counts are current hash-matched observations with a
separate origin record, not recovered historical execution counts. The
provisional observation report was explicitly invalid until declarations were
complete, and cannot be used as the final verification result.

Five existing audio files passed fresh probes and full audio decodes. Delivery
subtitle structure had 1,819 sequential cues with no zero duration or overlap;
raw subtitles retained two zero-duration cues, reported as timing defects.
Those existing points remain valid Core observations, not accepted subtitle
timing. No raw file was repaired. The projection has 13 unanchored artifacts,
3,638 cue anchors, 4 authored paths and 4 separately anchored native timelines.
Raw chunk clock bounds were checked against the existing exact-sample manifest;
no source offsets were applied and no transcript text entered the index.

This proves existing-receipt integration, current byte identity, audio
decodability and technical indexing for that local case. It does not reproduce
the original acquisition/MSST/Whisper execution, verify text/audio alignment,
establish human review, resolve raw timing defects or authorize publication.
The private assessment records those gates separately, with receipt, runner,
clock-manifest and compiled-manifest identity. Source Engineering, Catalog and
Work State remain under their own existing gates.

## Remaining integration

Acquisition receipts still describe planned artifact coverage and evidence paths;
their `completed` status is not converted into a verified workflow artifact.
Legacy Source Set hash/line/arc validation is unchanged. The audio-ASR dialect
adapter above is independently validated with fictional data. Actual local
workspaces need case-specific binding configurations and missing expected byte
counts before their receipts can be checked; the one private case above is an
additional local acceptance slice, not a replacement for synthetic package
tests. Other receipt dialects require their
own explicit mapping; no approval or provenance is silently inferred.
Continuous tool-produced bindings and real processing acceptance remain
subsequent gates. Existing media probing/decoding above is a revalidation gate,
not evidence of a newly executed processing pipeline.
This release is an executable indexing/evidence slice, not a complete portable
media-processing pipeline.
