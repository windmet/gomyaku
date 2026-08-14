# Provider-neutral authoring boundary

Subtitle editors, Whisper variants, Qwen, Gemini, and other external tools are
providers of timing or evidence. They are recorded as metadata in an authoring
workspace; they are not required by the canonical archive package.

The stable handoff is:

```text
source freeze -> provider result -> review ledger -> canonical event/person/source
```

Manual web-provider exchange remains a valid authoring step. The core only
needs the imported result, its time window, provider metadata, and review
status. Raw audio, local paths, and private ASR output must not enter a
portable publication package.
