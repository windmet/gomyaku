# GOMYAKU local development

GOMYAKU is the generic core and authoring home in the local split:

```text
E:\Web_build\gomyaku\         generic model / validation / projections / compiler
E:\Web_build\qianqingtie\     publication consumer
E:\Web_build\Megazine_blog\   legacy migration source / rollback reference
```

## Bootstrap

```powershell
cd E:\Web_build\gomyaku
npm ci
npm run validate
```

The canonical branch is `main`. The package is intentionally not a publication
site and has no Astro dev server; its acceptance surface is the independent
validation and compiler CLI.

## Current surface

- `src/model/`: portable schema primitives;
- `src/projections/`: generic People and Project capability projections;
- `src/validation/`: package and source-set invariants;
- `src/compiler/`: deterministic portable-package compilation;
- `src/cli/`: the generic CLI boundary;
- `tests/` and `scripts/`: fictional fixtures and package-surface checks.

Run the compiler smoke path only with synthetic inputs:

```powershell
npm run compile -- --help
```

## Core-first consumer changes

When Qianqingtie exposes a universal gap, change GOMYAKU first:

```text
generic contract → synthetic fixture → npm run validate
→ commit/push → exact SHA → Qianqingtie pin update
→ Qianqingtie full validate / TypeScript / publication checks
```

Do not use `npm link` as a standing dependency. For a pre-push package
rehearsal, use `npm pack`, install the tarball in a disposable consumer with
the lockfile disabled, then restore the canonical consumer pin with `npm ci`.

## Leakage boundary

No real project names, publication paths, audio, transcripts, private source
sets, or site-specific editorial conclusions may enter runtime code or tests.
If a proposal needs those materials, keep it in a separate private authoring
workspace and define a sanitized export contract first.
