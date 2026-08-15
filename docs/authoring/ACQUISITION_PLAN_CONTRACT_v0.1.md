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

The plan does not contain cookies, browser profiles, local download paths or
raw provider JSON. It does not call yt-dlp, modify `work-state.jsonl`, run
Whisper, or publish anything. A later local executor must be a separate,
explicitly authorized step.
