# Work State contract v0.1

Work State is the mutable, local bridge from a Catalog Media Item to an
existing Project. It is not Catalog metadata, not a downloader log, and not a
public projection. A row is accepted only when its status claims are backed by
workspace-relative evidence.

## JSONL row

```json
{
  "schemaVersion": 1,
  "item": "youtube:example123",
  "metadata": { "status": "complete" },
  "audio": { "status": "source-present" },
  "transcript": { "status": "canonical-draft", "backend": "..." },
  "project": { "status": "materialized", "projectId": "example-project" },
  "publication": { "status": "draft", "candidate": false },
  "evidence": [
    "Projects/example-project/.gomyaku/project.yaml",
    "Projects/example-project/source/example.webm"
  ]
}
```

Required fields are `schemaVersion: 1`, a Catalog item ID, and a non-empty
`evidence` array. Sections are optional; every present section must be an
object with a non-empty `status`. `publication.candidate`, when present, must
be boolean. Evidence entries are workspace-relative strings, never absolute
paths. Unknown or review-required work remains representable; the validator
does not infer completion from a missing section.

The validator also rejects duplicate Work State rows and references to Media
Items absent from the same Catalog workspace. It does not require every
Catalog item to have a Work State row.

## Runtime entry points

- `validateWorkState(row)` checks one row;
- `validateWorkStateRows(rows, { knownItemIds })` checks duplicate and reference
  boundaries;
- `catalog validate-work-state --workspace <path> --evidence-root <root>`
  performs a read-only local check, resolves every evidence path inside the
  supplied workspace root (including a symlink escape check), and returns a
  JSON report. Without `--evidence-root`, it reports structural validation only
  and marks the evidence check `not-run`.

The generic package exports the structural validators at
`gomyaku/catalog/work-state`. No validator writes Work State or executes an
acquisition plan; actual file existence is intentionally a local CLI gate.

## Boundary decisions

- Work State stays in the local Catalog workspace; it is not copied into
  Qianqingtie or the generic test fixtures as real corpus data.
- `komatsu36` remains unlinked until its YouTube and X Space source set is
  explicitly reviewed; a matching YouTube item alone is insufficient evidence.
- A Project can be materialized or have an audio source present while its
  transcript, publication, or source-engineering sections remain draft/open.
- A valid row proves structural and evidence discipline only; it does not
  prove that an audio file is audible, a transcript is semantically correct, or
  a publication is consumer-accepted.
