# Media Catalog implementation status v0.1

Status: CAT-00 through CAT-08 are complete, and CAT-10–CAT-13 now extend the
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
local action is to query the catalog and select a real item; only an explicit
materialization plan may cross into the existing Project authoring workflow.
