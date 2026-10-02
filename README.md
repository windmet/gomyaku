# GOMYAKU

Generic indexing and independent local media workflow integration.

The new [`gomyaku/core`](docs/INDEX_CORE.md) entrypoint provides stable
references, reverse indexes, source-native time ordering, ordered paths, and
deterministic serialization. It imports no framework, Catalog, filesystem,
publication policy, or media tool. `npm run test:core` verifies it independently.

The independent [`gomyaku/workflow`](docs/WORKFLOW_EVIDENCE.md) adapter now maps
declared technical artifacts and native-clock segments into Core. The separate
`gomyaku/workflow/files` export audits actual byte identity under an explicit
local root, and the offline CLI exercises both paths without Catalog or publication
approval. `gomyaku/workflow/receipts` adapts explicitly selected fields from the
existing schema-1 audio/ASR receipt dialect; missing byte counts require declared
supplements. Existing local audio/subtitle tooling remains authoritative;
real workspace bindings and real processing acceptance remain pending. This package
does not yet ship a replacement media-processing pipeline.

This is a fresh-history shadow repository. It intentionally contains no real
publication corpus and no Reader application. Core and Workflow acceptance
are independently executable:

```text
npm install
npm run validate
```

The retained v0.1 compatibility surface includes:

- portable project schema factories;
- generic People and project-capability projections;
- source-set and canonical-package validation;
- deterministic portable-package compilation;
- fictional simple, multi-track, and public-record fixtures.

The first Authoring vertical slice is the provider-neutral Media Catalog /
Source Discovery boundary. Its contract and current CAT-00–CAT-29 status are
documented in [`docs/authoring/`](docs/authoring/). Catalog tests use synthetic
yt-dlp observations; real channel inventory remains in a separate local
Authoring Workspace and never enters this repository. Query, source-set
approval, materialization approval, receipt-template, receipt-verification,
Work State proposal, Work State approval-template, and execution-preflight
commands are non-destructive; template commands only copy exact plan coverage
and leave execution/review fields blank. The separate apply command mutates
only after explicit review, evidence, backup, and `--apply-reviewed`.

Provider tools remain interchangeable authoring inputs. The future consumer
direction is `GOMYAKU -> publication`; publication data does not flow back into
the generic core.
