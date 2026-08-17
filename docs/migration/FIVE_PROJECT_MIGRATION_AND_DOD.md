# Qianqingtie Five-Project Migration and Project Definition of Done

> Purpose: migrate the current corpus to the automatic-entry contract and provide a reusable checklist for every future Project.

---

# 1. Current corpus

The currently developed five-Project corpus is:

| Project | Type | Presentation class |
|---|---|---|
| `komatsu36` | Special | Feature |
| `komachoe-20260309` | Episode | Standard |
| `komachoe-20260425` | Episode | Standard |
| `komachoe-20260729` | Episode | Standard |
| `gouriteki-20260809` | Episode | Compact |

The migration should use these five as the initial real-world compatibility matrix.

---

# 2. Migration objective

After migration, adding Project number 6 should not require copying the same manual entry work performed for Projects 4 and 5.

The desired invariant is:

```text
published Project data
    ↓
site projections update automatically
```

---

# 3. Phase 1 — separate publication timestamps

Add:

```text
publication.publishedAt
publication.updatedAt
```

to all five Projects.

Suggested initial values should be based on actual qianqingtie publication history, not original source dates.

Known recent editorial revision dates may be used only as migration hints and must be verified before committing.

The source/program dates remain unchanged:

```text
publication.date
```

---

# 4. Phase 2 — explicit homepage curation

Replace implicit sorting rules for the featured area.

Current behavior conceptually mixes:

```text
featured
special priority
source date
```

Target behavior:

```text
homeOrder
```

Example only:

```json
{
  "publication": {
    "homeOrder": 10
  }
}
```

The actual numbers should reflect the intended reading path.

Use gaps such as:

```text
10
20
30
40
```

instead of:

```text
1
2
3
4
```

so future inserts do not require renumbering everything.

---

# 5. Phase 3 — classify presentation density

Recommended initial mapping:

```text
komatsu36
  → feature

komachoe-20260309
  → standard

komachoe-20260425
  → standard

komachoe-20260729
  → standard

gouriteki-20260809
  → compact
```

Do not alter the current `views` merely to match the density class.

Especially:

```text
gouriteki-20260809
```

should remain valid with:

```text
overview
timeline
mentions
```

Its six Acts can remain represented within Timeline without exposing a redundant Sections tab.

---

# 6. Phase 4 — repair Recent Feed semantics

Current problem:

```text
RecentFeed
  sorts Project by publication.date
```

This means a Project authored today for an older program may not appear as a recent site update.

Target:

```text
Recent Updates
  → project.publication.updatedAt
```

Suggested UI wording:

```text
RECENT UPDATES
近期更新
```

or:

```text
BY SITE UPDATE
近期更新
```

Per-row metadata:

```text
更新 2026.08.17 · 节目 2026.08.09
```

Avoid presenting only the source date in this feed.

---

# 7. Phase 5 — derive series context

For Komachoe Projects sharing:

```text
seriesKey = "komachoe-radio"
```

derive:

- series episode list;
- previous Project;
- next Project;
- position within structured archive corpus.

Do not manually add each new Komachoe slug to a series page.

A future fourth/fifth/sixth episode should appear from metadata alone.

---

# 8. Phase 6 — add discoverability validator

Add a validator whose purpose is not visual correctness but corpus closure.

Minimum checks:

```text
For every published Project:
  Project catalog contains it
  Search contains it
  Recent-update projection contains it

If seriesKey exists:
  Series projection contains it

If homeOrder exists:
  Featured projection contains it

All person references resolve
All index references resolve
```

Name suggestion:

```text
verify:project-discoverability
```

Add it to the existing `validate` chain.

---

# 9. Phase 7 — regression strategy cleanup

Keep:

```text
Feature golden
Standard golden
Compact golden
```

Do not create:

```text
verify-komachoe-20260309-entry
verify-komachoe-20260425-entry
verify-komachoe-20260729-entry
verify-gouriteki-entry
verify-next-project-entry
...
```

The latter will scale linearly with corpus size and encode the wrong abstraction.

Project-specific regression remains appropriate only when the Project has unique UI behavior.

---

# 10. Suggested implementation order

Recommended PR sequence:

## PR A — Publication metadata contract

Changes:

- update schema;
- add `publishedAt`;
- add `updatedAt`;
- add `homeOrder`;
- optionally add `presentationDensity`;
- migrate five Projects;
- validation only.

No visual redesign required.

---

## PR B — Homepage projection semantics

Changes:

- Featured area sorts by `homeOrder`;
- Recent Feed sorts by `updatedAt`;
- source date remains independently displayed;
- rename labels as needed;
- update home projection tests.

---

## PR C — Series projection

Changes:

- promote `seriesKey` into reusable projection;
- previous/next;
- all-series link;
- series ordering;
- tests.

This can be postponed until the series UI is actually wanted; the metadata contract should support it now.

---

## PR D — Discoverability invariant

Changes:

- add `verify-project-discoverability`;
- assert catalog/search/home/series closure;
- add to `npm run validate`.

After this PR, forgotten entry wiring becomes a CI failure instead of a user-discovered defect.

---

## PR E — Presentation-class regressions

Changes:

- Feature fixture;
- Standard fixture;
- Compact fixture;
- reduce redundant project-by-project entry regression where safe.

---

# 11. New Project template

Every new Project should begin from content, not UI.

Suggested authoring checklist:

```text
src/content/projects/<id>/
  project.json
  tracks/
  acts/
  events/
  people/
  sources/       # when needed
  threads/       # when needed
  editorial/     # when needed
```

Minimum `project.json` publication portion:

```json
{
  "publication": {
    "kind": "episode",
    "date": "2026-08-XX",
    "publishedAt": "2026-08-XX",
    "updatedAt": "2026-08-XX",
    "seriesKey": "example-series",
    "presentationDensity": "standard"
  }
}
```

Add `homeOrder` only if the Project is intentionally curated into the homepage featured reading path.

---

# 12. New Project Definition of Done

Copy this section into PR descriptions.

## Content

- [ ] Project core metadata exists.
- [ ] All referenced Tracks exist.
- [ ] All referenced Acts exist.
- [ ] All referenced Events exist.
- [ ] All referenced People exist.
- [ ] Sources/Threads exist where used.
- [ ] Cross-reference validation passes.

## Publication metadata

- [ ] `publication.date` = original program/event date.
- [ ] `publication.publishedAt` = first qianqingtie public date.
- [ ] `publication.updatedAt` = current reader-visible update date.
- [ ] `seriesKey` is correct when applicable.
- [ ] `views` match actual content.
- [ ] `presentationDensity` matches intended visual density.
- [ ] `homeOrder` is present only when editorially featured.

## Automatic entry

- [ ] `/projects/<slug>/` is generated by the dynamic route.
- [ ] Search includes the Project without slug-specific code.
- [ ] Recent Updates includes the Project based on `updatedAt`.
- [ ] Series context includes the Project when applicable.
- [ ] People backlinks derive automatically.
- [ ] Index backlinks derive automatically when referenced.
- [ ] No homepage source file was edited solely to register the slug.

## Regression

- [ ] Existing Feature presentation still passes.
- [ ] Existing Standard presentation still passes.
- [ ] Existing Compact presentation still passes.
- [ ] No new project-specific regression was added unless there is genuinely unique behavior.

## Engineering review

- [ ] Search repo for the new Project ID.
- [ ] Every code occurrence is justified.
- [ ] No `if (project.id === "<new-id>")` exists for ordinary discoverability.
- [ ] No hardcoded known-project array was extended.

---

# 13. Agent instructions for future additions

When asking Codex/Claude/another agent to add a Project, use this rule:

> Add the Project entirely through the canonical content model and reusable projection architecture. Do not create slug-specific homepage, search, series, people, or navigation wiring. If an expected entry does not appear automatically, treat that as a projection/validation defect and fix the reusable layer rather than patching this Project.

A stronger prompt:

```text
Before changing UI code, determine whether the requested behavior should already
be derivable from Project metadata. If yes, modify the reusable projection and its
invariant tests. Do not add project-ID-specific registration logic.
```

---

# 14. Review heuristic

For every new Project PR:

```bash
git grep "<project-id>" src scripts
```

Expected matches:

```text
content files
possibly a golden fixture if deliberately chosen as representative
```

Suspicious matches:

```text
index.astro
RecentFeed.astro
ProjectArchiveShell.astro
search.json.ts
series route source
hardcoded arrays
switch statements
```

Any suspicious match requires justification in review.

---

# 15. Architecture acceptance criteria

This migration is complete when the following experiment succeeds:

1. Duplicate a valid Standard Episode fixture.
2. Give it a new ID, title, dates, and content.
3. Do not edit homepage/search/series/people UI code.
4. Run validation.
5. Start the site.

Expected:

```text
new Project route exists
search finds it
recent updates shows it
series includes it if seriesKey is set
people context resolves
homepage featured area includes it only if homeOrder is set
```

If that experiment fails, the repository still contains manual registration debt.

---

# 16. The principle to preserve

The repository should evolve toward this rule:

> Creating content may be manual.
> Curating prominence may be manual.
> Discoverability must not be manual.

That is the point where qianqingtie stops behaving like a set of hand-maintained专题页 and starts behaving like a maintainable archival publication system.
