# Media Catalog implementation status v0.1

Status: CAT-00 through CAT-05 implemented as a generic, offline-testable
vertical slice. No real channel scan has been run from this repository.

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

Before the first real channel scan, CAT-06 through CAT-08 must add
status/query/export views and the required
catalog data-quality checks. The real scan then remains a local
Authoring Workspace operation under `E:\GOMYAKU\Catalogs`, never a
GOMYAKU repository fixture.
