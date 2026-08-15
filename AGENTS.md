# GOMYAKU agent contract

## Role

This is the **generic archive core and authoring** repository. It owns
portable model/schema primitives, validation invariants, projections,
deterministic compilation, and future authoring workflow surfaces.

It is not a publication site and must remain independent of Qianqingtie.

## Working rules

- Work from `main` unless a review branch is explicitly requested.
- Never read real Qianqingtie corpus, private RAW, local ASR, or publication
  copy into runtime code or committed fixtures.
- Use fictional/synthetic fixtures for contract tests. Provider names may be
  documented as interchangeable authoring inputs, but no provider-specific
  corpus or credentials belong here.
- Media Catalog code may define provider interfaces, yt-dlp observation
  parsing, normalization, classification primitives, and workspace contracts;
  the real channel inventory, raw observations, rules, overrides, and work
  state belong in the private local Authoring Workspace.
- Never run a real channel scan as part of a generic test or commit. Use an
  explicit offline observation fixture until the catalog acceptance gate says
  the local scan is ready.
- Keep Reader UI, homepage, brand, rights, editorial summaries, and
  case-specific regressions in the consumer repository.
- A generic change must be usable without Qianqingtie installed.

## Verification

```powershell
npm ci
npm run validate
git diff --check
```

The package surface, synthetic fixtures, TypeScript declarations, and
deterministic compiler must remain independently verifiable. The CI runtime is
Node.js 22.12.0.

## Consumer release sequence

For a contract change:

1. add or update a synthetic fixture and the generic implementation;
2. run the full GOMYAKU validation;
3. commit/push and record the exact SHA (or an explicitly reviewed alpha tag);
4. let each consumer update its pin and prove its own regressions.

Never import publication code into GOMYAKU to make a consumer test pass.
