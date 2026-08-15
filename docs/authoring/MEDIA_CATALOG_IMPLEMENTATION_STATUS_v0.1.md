# Media Catalog implementation status v0.1

Status: CAT-00 through CAT-08 are complete, and CAT-10–CAT-24 now extend the
generic slice with read-only query and explicit materialization plans. The
workflow remains offline-testable in this repository; CAT-09 real acceptance
is local-only.

## Completed in this slice

- CAT-00: authoring ownership and local/public boundary documented;
- CAT-01: catalog workspace layout, JSONL read/write helpers, and runtime
  Media Item validation;
- CAT-02: provider-independent normalization contract with deterministic
  synthetic fixtures;
- CAT-03: YouTube/yt-dlp flat-observation parser, argument builder, and an
  offline `catalog sync --observation-file` path.
- CAT-04: idempotent JSONL merge with `NEW`/`UPDATED`/`UNCHANGED`/`REJECTED`
  counts; observation timestamps do not create false metadata updates.
- CAT-05: deterministic rule classification, reviewed override precedence,
  same-priority scalar conflict detection, unclassified counts, and rerunnable
  `NEW`/`CHANGED`/`UNCHANGED` diffs.
- CAT-06: deterministic status summaries and Markdown/JSON reports with
  duplicate/reference checks and canonical local-path leak detection.
- CAT-07: portable row model plus Markdown/JSON views are generic; a synthetic
  XLSX human view was rendered and visually verified through an optional local
  renderer, while the repository remains independent of Codex-only spreadsheet
  packages.
- CAT-08: the synthetic YouTube fixture exercises the full offline seam:
  nested and flat yt-dlp observations, stable normalization, idempotent merge,
  rule/override classification, conflict reporting, unknown-reference and
  canonical-local-path rejection, status summaries, and Markdown row export.
  The same fixture runs through `npm run test:catalog` as the pre-network data-
  quality gate.
- CAT-10: provider-neutral query filters span metadata, classification and
  local Work State without collapsing those layers; results are deterministic
  and read-only.
- CAT-11: explicit Project materialization produces a provenance-rich plan
  only. It never creates a directory, downloads media, runs ASR, or publishes.
- CAT-12: explicit Acquisition Plans list requested audio/video/chat/comments
  artifacts and existing local status without executing a downloader or
  mutating Work State.
- CAT-13: Work State rows have an evidence-first schema, duplicate/reference
  validation, a read-only CLI check, and a generic package export.
- CAT-14: Project materialization accepts an explicitly listed single- or
  multi-source set without inferring additional origins; the single-source
  plan shape remains compatible.
- CAT-15: provider-neutral Source Set Review Plans represent explicitly listed
  cross-provider sources with unresolved URLs allowed and inference disabled.
- CAT-16: the local Work State CLI resolves evidence files inside the workspace
  and rejects missing or symlink-escaped evidence without mutating state.
- CAT-17: Work State and Source Set Review share the same explicit local
  evidence-file gate and report checked/missing counts.
- CAT-18: Source Set Review has an explicit approval artifact that requires
  exact source-ID confirmation, reviewer metadata, provided URLs, and a clean
  local evidence check; approval never mutates Work State.
- CAT-19: an approved provider-neutral Source Set can produce a read-only
  Project materialization plan without inventing Catalog classifications or
  collapsing X Space sources into YouTube metadata.
- CAT-20: Acquisition Plans have a separate receipt verifier that requires
  exact item/artifact coverage, explicit execution metadata, status consistency,
  and evidence-file checks without mutating Work State.
- CAT-21: a complete, evidence-verified acquisition receipt can produce a
  pending Work State update plan; the proposal remains a separate reviewed
  apply step and never edits local Work State itself.
- CAT-22: applying a Work State proposal is a separately gated mutation that
  requires an exact approval artifact, clean evidence, a non-existing backup
  path, and an explicit `--apply-reviewed` flag; unrelated rows and sections
  are preserved.
- CAT-23: Catalog Project materialization plans have a separate approval
  artifact for Project ID and exact ordered source IDs.
- CAT-24: Acquisition Plans can bind to an approved materialization plan and
  reject a pending or mismatched source selection.
- CAT-25: pending materialization and Source Set Review plans can generate
  exact-ID approval templates; reviewer metadata stays blank and no approval
  is inferred.
- CAT-26: an Acquisition Plan can generate an exact-coverage receipt template;
  execution metadata, result status, evidence and notes remain blank until
  real work is performed.

## Deliberately not included yet

- no network call to a real YouTube channel;
- no audio, chat, comments, Whisper, or download execution;
- no AI classification, XLSX export, public projection, or Qianqingtie Reader;
- no default local path and no provider-specific corpus in GOMYAKU tests.

## Current contract

```text
yt-dlp JSONL observation
        ↓
YouTube provider parser
        ↓
portable MediaItem JSONL
        ↓
workspace items.jsonl
```

The offline sync path is intentionally fed by an explicit observation file so
the provider seam can be tested without network access. A future real scan
may invoke yt-dlp through an explicit workspace command, but it must preserve
the same observation and normalization boundary.

## Next gate

CAT-09 is the real-channel fixture acceptance and is complete in the local
Workspace. It must run only as a local Authoring Workspace operation under
`E:\GOMYAKU\Catalogs`, never as a GOMYAKU repository fixture or part of the
generic test suite. The acceptance record includes the exact source URL,
observation timestamp, item count, metadata completeness, availability
distribution, classification coverage, unknown/conflict counts, and generated
status/export hashes. Cookies, download paths, raw observations, and other
local acquisition details stay in the local workspace boundary. The next
local action is a human-approved source-set rehearsal. The real `komatsu36`
plan remains pending until its operator supplies an approval artifact; no
approval is inferred from the URLs or local filenames.
