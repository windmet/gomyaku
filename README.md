# GOMYAKU

Generic archive model, authoring boundary, validation, projections, and a
deterministic portable-package compiler.

This is a fresh-history shadow repository. It intentionally contains no real
publication corpus and no Reader application. The first acceptance target is
independent core validation:

```text
npm install
npm run validate
```

The current v0.1 surface includes:

- portable project schema factories;
- generic People and project-capability projections;
- source-set and canonical-package validation;
- deterministic portable-package compilation;
- fictional simple, multi-track, and public-record fixtures.

The first Authoring vertical slice is the provider-neutral Media Catalog /
Source Discovery boundary. Its contract and current CAT-00–CAT-27 status are
documented in [`docs/authoring/`](docs/authoring/). Catalog tests use synthetic
yt-dlp observations; real channel inventory remains in a separate local
Authoring Workspace and never enters this repository. Query, source-set
approval, materialization approval, receipt-template, receipt-verification,
Work State proposal, and Work State approval-template commands are
non-destructive; template commands only copy exact plan coverage and leave
execution/review fields blank. The separate apply command mutates only after
explicit review, evidence, backup, and `--apply-reviewed`.

Provider tools remain interchangeable authoring inputs. The future consumer
direction is `GOMYAKU -> publication`; publication data does not flow back into
the generic core.
