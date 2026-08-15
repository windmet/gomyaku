# Project materialization contract v0.1

Project materialization begins with a selected Catalog Media Item and produces
a deterministic **plan**, not a download and not a publication. The plan
inherits stable source metadata and the current classification while keeping
local Work State out of the portable Catalog layers.

```text
Catalog query / human selection
          ↓
project materialization plan
          ↓ explicit local Workspace action
Project source set + local project manifest
```

The plan records:

- Catalog and Media Item provenance;
- selected Project ID/title and optional explicitly supplied local root;
- source URL, provider ID, publication time and duration when present;
- classification snapshot used for selection;
- a required selection reason and explicit next steps.

The generic CLI command is intentionally non-destructive:

```text
gomyaku project materialize \
  --catalog-workspace <path> \
  --item youtube:example \
  --project-id example-project \
  --reason "human selection reason" \
  --out plan.json
```

It does not create directories, download audio/video/chat/comments, run ASR,
invent Event records, or publish to Qianqingtie. A local Workspace adapter may
consume the plan only after source-set review and explicit acquisition. No
local path is emitted unless the caller supplies `--project-root`.
