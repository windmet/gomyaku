# Acquisition Plan contract v0.1

An Acquisition Plan is the explicit hand-off from a reviewed Catalog query to
a possible local download operation. It is a plan, not an executor.

```text
Catalog query / human selection
          ↓
acquisition-plan.json
          ↓ explicit operator execution
audio / video / chat / comments
          ↓
local Work State update
```

Each request records the selected Media Item, a classification summary, the
already-known local status for audio/chat/comments, requested artifact types,
and an eligibility marker. An unavailable or private item is retained as
`review-required`; it is never silently deleted or relabeled.

The generic CLI is deliberately non-destructive:

```text
gomyaku acquire plan \
  --workspace <path> \
  --item youtube:example \
  --artifact audio,chat,comments \
  --plan-id komachoe-20260309-r1 \
  --reason "selected for production review" \
  --out plan.json
```

For a selected Project, pass its approved materialization plan so the
Acquisition Plan cannot silently target a different source set:

```text
gomyaku acquire plan \
  --workspace <path> \
  --item youtube:example \
  --artifact audio,chat,comments \
  --plan-id example-r1 \
  --reason "approved Project rehearsal" \
  --materialization-plan approved-materialization-plan.json \
  --out plan.json
```

When supplied, the CLI requires the materialization approval to be complete and
the selected item IDs to match exactly. Existing callers without this flag
remain plan-only for backward compatibility.

The plan does not contain cookies, browser profiles, local download paths or
raw provider JSON. It does not call yt-dlp, modify `work-state.jsonl`, run
Whisper, or publish anything. A later local executor must be a separate,
explicitly authorized step.

## Execution receipt

After an operator or provider adapter actually performs the plan, it should
write a separate `acquisition-receipt` rather than editing the plan or guessing
Work State. Every planned item/artifact pair must appear exactly once:

```json
{
  "schemaVersion": 1,
  "kind": "acquisition-receipt",
  "planId": "komachoe-20260309-r1",
  "execution": {
    "status": "completed",
    "adapter": "local-yt-dlp-wrapper",
    "executedBy": "operator-id",
    "executedAt": "2026-08-15T00:00:00.000Z"
  },
  "artifacts": [
    {
      "item": "youtube:example",
      "type": "audio",
      "status": "completed",
      "evidence": ["Projects/example/source/audio.wav"]
    }
  ]
}
```

`completed` artifacts require workspace-relative evidence paths. `failed` and
`skipped` artifacts require a note. The read-only verifier checks plan coverage,
duplicate/extraneous artifacts, execution status consistency, and actual file
existence when an evidence root is supplied:

```text
gomyaku acquire verify-receipt \
  --plan acquisition-plan.json \
  --receipt acquisition-receipt.json \
  --evidence-root E:\\GOMYAKU \
  --out acquisition-receipt-report.json
```

The verifier never writes `work-state.jsonl`; a human or a separate reviewed
adapter must perform that state transition using the verified receipt.
