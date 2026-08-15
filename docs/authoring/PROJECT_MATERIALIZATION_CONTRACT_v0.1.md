# Project materialization contract v0.1

Project materialization begins with one or more explicitly selected Catalog
Media Items and produces a deterministic **plan**, not a download and not a
publication. The plan inherits stable source metadata and the current
classification while keeping local Work State out of the portable Catalog
layers. A multi-source plan never infers additional tracks from title, date,
or platform similarity.

```text
Catalog query / human selection of an explicit source set
          ↓
project materialization plan
          ↓ explicit local Workspace action
Project source set + local project manifest
```

The plan records:

- Catalog and every selected Media Item provenance;
- selected Project ID/title and optional explicitly supplied local root;
- source URL, provider ID, publication time and duration for every selected
  source when present;
- classification snapshot used for each selected source;
- a `sourceSet.kind` of `single` or `multi` and the exact selected IDs;
- a required selection reason and explicit next steps.

The generic CLI command is intentionally non-destructive:

```text
gomyaku project materialize \
  --catalog-workspace <path> \
  --item youtube:example[,youtube:other-source] \
  --project-id example-project \
  --reason "human selection reason" \
  --out plan.json
```

It does not create directories, download audio/video/chat/comments, run ASR,
invent Event records, or publish to Qianqingtie. A local Workspace adapter may
consume the plan only after source-set review and explicit acquisition. No
local path is emitted unless the caller supplies `--project-root`.
