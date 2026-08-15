# Source Set Review contract v0.1

Some Projects combine sources that cannot be represented by one Catalog
provider: for example a YouTube main stream plus one or more X Spaces. A
Source Set Review Plan is the explicit, pending hand-off for that case. It
records only sources the operator lists and requires evidence for each one; it
does not claim that the set is correct.

```text
explicit source list + evidence
              ↓
source-set-review-plan (pending)
              ↓ human confirmation
Project materialization / Acquisition Plan
```

Each source has a stable `id`, provider, external ID, origin (`catalog` or
`explicit`), and a non-empty workspace-relative evidence list. A URL may be
missing; in that case the plan records `urlStatus: unresolved` rather than
constructing a URL from a filename or ID. The plan sets
`selection.inference: disabled` and `review.requiresHumanConfirmation: true`.

The generic CLI accepts a JSON source list:

```text
gomyaku project source-set-plan \
  --sources komatsu36-source-set.json \
  --project-id komatsu36 \
  --reason "Existing local source evidence requires manual set review" \
  --out source-set-review.json
```

The command is read-only. It does not attach a source to a Project, update
Work State, download media, run ASR, or publish. A source-set plan with an
unresolved URL is still useful as a review queue, but cannot be treated as a
complete source manifest until a human resolves it.
