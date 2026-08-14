# GOMYAKU boundary

GOMYAKU is the generic archive and authoring core. It owns portable model
primitives, validation, deterministic compilation, provider-neutral evidence
contracts, and synthetic fixtures.

It does not own a publication's people, homepage, brand, Reader UI, rights
decisions, or actual corpus. A consumer supplies its own collection loader and
presentation adapter.

The dependency direction is one-way:

```text
authoring / evidence
        -> canonical archive package
        -> deterministic portable package
        -> publication consumer
```

The package must not depend on an Astro loader, a particular ASR vendor, a
private workspace path, or a publication-specific taxonomy.
