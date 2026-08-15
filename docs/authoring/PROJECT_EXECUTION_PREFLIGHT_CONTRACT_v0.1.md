# Project execution preflight contract v0.1

The execution preflight is the read-only boundary between reviewed plans and a
local production adapter. It refuses a pending materialization plan, an
unbound Acquisition Plan, a plan that is no longer `not-executed`, or a target
Project root outside the declared workspace root.

```text
approved materialization plan + bound acquisition plan + safe Project root
                         ↓
              project-execution-preflight
                         ↓
              separately authorized local adapter
```

Run it explicitly before handing plans to yt-dlp, GUI tools, ASR, or any local
Project writer:

```text
gomyaku project execution-preflight \
  --materialization-plan approved-materialization-plan.json \
  --acquisition-plan acquisition-plan.json \
  --workspace-root E:\\GOMYAKU\\Projects \
  --project-root E:\\GOMYAKU\\Projects\\example-project \
  --out execution-preflight.json
```

The report checks:

- approved materialization review metadata;
- Acquisition Plan `not-executed` and explicit-approval state;
- materialization plan ID, Project ID and exact selected Media Item parity;
- absolute Project/workspace roots and containment;
- whether the Project directory exists or still needs a separately reviewed
  creation step.

`valid: true` does not execute anything and does not prove media quality. It
only authorizes the next human-reviewed hand-off. The command never downloads,
runs ASR, writes a Project manifest, or mutates Work State.
