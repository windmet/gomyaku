# Qianqingtie Project Onboarding Contract

> Status: Proposed engineering contract
> Scope: `qianqingtie` publication repository
> Goal: Adding a valid Project should automatically make it discoverable across the site without branch-local "entry wiring" patches.

---

## 1. Why this contract exists

`qianqingtie` has already moved beyond a site made of individually authored pages.

The current architecture is data-first:

```text
Project content
  ↓
Astro Content Collections / Zod
  ↓
Gomyaku project schema + presentation capability derivation
  ↓
Qianqingtie projection layer
  ↓
Generic routes / Reader UI / homepage / search / people / indexes
```

The engineering problem is therefore no longer:

> "How do we add another page?"

It is:

> "What is the smallest valid set of content and metadata that lets the publication layer derive every appropriate entry point automatically?"

A mature implementation must not require a developer to remember a growing checklist of unrelated UI files every time a Project is added.

If a Project exists, is published, satisfies the content contract, and passes validation, its normal public entry points should be produced by projection code.

Manual work should be reserved for **editorial decisions**, not **mechanical wiring**.

---

# 2. Core principle

## 2.1 Project registration is data, not UI code

A Project is considered registered when its canonical content exists under the content collection and satisfies the Project schema.

For example:

```text
src/content/projects/<project-id>/
  project.json
  tracks/
  acts/
  events/
  people/
  ...
```

The repository must NOT require a second registration step such as:

- adding the project slug to a homepage array;
- adding the project slug to a "known projects" switch;
- adding the project slug to the search index manually;
- adding the project slug to a series page manually;
- adding a new Astro route;
- adding project-specific navigation wiring;
- adding a one-off home card.

For ordinary Projects, the canonical data itself is the registration source.

---

# 3. Ownership boundary

## 3.1 Gomyaku owns generic archive semantics

`gomyaku` should continue to own reusable concepts such as:

- Project core schema;
- Track / Act / Event / Thread / Source / Person schemas;
- presentation capability derivation;
- generic validation primitives;
- compiler / evidence / authoring infrastructure.

## 3.2 Qianqingtie owns publication semantics

`qianqingtie` owns decisions that are specific to this publication:

- whether a Project is public;
- how it appears on the homepage;
- publication/update timestamps;
- series membership from the Reader's perspective;
- editorial labels and summaries;
- presentation density;
- whether it should be featured;
- update-feed behavior;
- publication-specific regression tests.

Do **not** move homepage ordering, site update semantics, or editorial curation into Gomyaku merely because they are metadata.

---

# 4. Required Project publication metadata

The current `publication` object should become the single publication-facing metadata contract.

Recommended target shape:

```ts
publication: {
  kind: "special" | "episode",

  // Date of the source program/event itself.
  date: "YYYY-MM-DD",

  // First date this Project became publicly available on qianqingtie.
  publishedAt: "YYYY-MM-DD",

  // Last reader-meaningful update.
  updatedAt: "YYYY-MM-DD",

  // Optional stable series identity.
  seriesKey?: string,

  // Homepage editorial curation.
  featured?: boolean,
  homeOrder?: number,

  // Optional compact homepage description.
  homeDeck?: string,

  // Controls visual density, not semantic capabilities.
  presentationDensity?: "compact" | "standard" | "feature"
}
```

Optional future extension:

```ts
update: {
  kind?: "new" | "expanded" | "corrected",
  note?: string
}
```

Do not add this until the homepage/update log actually needs it.

---

# 5. Timestamp semantics

The repository must distinguish three different concepts.

## 5.1 `publication.date`

Meaning:

> When did the original broadcast/event/source happen?

Use it for:

- series chronology;
- archive chronology;
- original program date shown in the Reader;
- "episodes by date";
- historical coverage.

Never reinterpret this field as "when this page was added to qianqingtie".

---

## 5.2 `publication.publishedAt`

Meaning:

> When did qianqingtie first publish this structured Project?

Use it for:

- first-publication history;
- changelog entries;
- determining whether an item is "new" if this distinction is later needed.

It should normally remain stable after first publication.

---

## 5.3 `publication.updatedAt`

Meaning:

> When did the public-facing Project most recently receive a meaningful editorial/content update?

Use it for:

- homepage "recent updates";
- update feeds;
- corpus activity views.

Do not update it for:

- dependency bumps;
- formatting-only code changes;
- CI changes;
- Gomyaku pin updates;
- internal refactors that do not change reader-visible archive content.

---

## 5.4 Do not use Git commit time as publication state

Git history is engineering history.

Qianqingtie publication state is editorial history.

These are related but not equivalent.

Therefore:

```text
Git commit timestamp ≠ updatedAt
```

A commit may touch a Project without changing reader-visible content, and a single editorial update may span several commits.

---

# 6. Presentation classes

Projects are not required to expose identical Reader views.

The correct abstraction is:

> consistent visual grammar + capability-driven views

not:

> identical tab counts

Recommended classes:

## 6.1 Compact

Example:

```text
Overview
Timeline
Mentions
```

Use for:

- short broadcasts;
- announcement programs;
- programs where a standalone Sections tab would duplicate the timeline.

Example current fit:

- `gouriteki-20260809`

---

## 6.2 Standard

Example:

```text
Overview
Sections
Timeline
Mentions
```

Use for ordinary structured broadcast episodes.

Example current fit:

- `komachoe-20260309`
- `komachoe-20260425`
- `komachoe-20260729`

---

## 6.3 Feature

Example:

```text
Overview
Timeline
Storylines
People
Transcript
```

Use for dense specials with multiple sources, narrative threads, or broader context.

Example current fit:

- `komatsu36`

---

## 6.4 `views` remains authoritative

`presentationDensity` must not become a second source of truth for feature availability.

Correct relationship:

```text
views
  → what the Project can show

presentationDensity
  → how densely the Reader presents it
```

For example, `compact` may alter spacing, nav width, card density, and overview height, but must not silently add/remove semantic views.

---

# 7. Project ID rules

A Project ID should be:

- stable;
- URL-safe;
- human-recognizable;
- never changed merely for display reasons.

Examples:

```text
komatsu36
komachoe-20260309
komachoe-20260425
komachoe-20260729
gouriteki-20260809
```

The route should continue to be derived from content:

```text
/projects/[slug]
```

No new Astro page should be required per Project.

---

# 8. Automatic discoverability contract

Once a Project satisfies all of the following:

```text
1. Content exists
2. Project schema validates
3. Publication metadata validates
4. Project status is public/published
5. Cross-references resolve
6. Projection tests pass
```

then the following should be automatic where applicable:

- `/projects/<slug>/`
- global search presence;
- homepage recent-update feed;
- homepage archive pool;
- series membership;
- people-context backlinks;
- index/project crosslinks;
- sitemap/site metadata if generated from collections.

There must be no "remember to add it to X" step for these normal surfaces.

---

# 9. Editorial surfaces are allowed to be selective

Automatic discoverability does NOT mean every Project must appear everywhere.

The correct model is:

```text
Corpus membership = automatic
Editorial prominence = metadata-driven
```

Examples:

A Project should enter the general corpus automatically.

A Project appears in "From here / 从这里开始" only if publication metadata says it belongs there.

That decision may use:

```json
{
  "featured": true,
  "homeOrder": 20
}
```

The Project still requires no UI code patch.

---

# 10. Homepage ordering contract

Do not encode editorial order through accidental business logic such as:

```text
featured first
then special first
then publication date
```

That mixes three unrelated concepts.

Recommended:

```text
Featured / 从这里开始
  → explicit homeOrder

Recent updates
  → updatedAt DESC

Archive chronology
  → publication.date DESC
```

If an item is not curated for the featured area, omit `homeOrder`.

Suggested rule:

```ts
featured === true
  → homeOrder is required
```

or simplify further:

```ts
homeOrder exists
  → item is included in curated home area
```

The latter avoids two fields representing one decision.

---

# 11. Series contract

A Project with:

```json
{
  "publication": {
    "seriesKey": "komachoe-radio"
  }
}
```

should be automatically included in that series projection.

The series Reader may derive:

- all episodes;
- chronological order;
- previous episode;
- next episode;
- latest episode;
- episode count;
- link to all structured archives in the series.

No project slug should be added manually to a source-code list.

If a series needs display metadata, create one canonical series metadata record keyed by `seriesKey`, rather than duplicating the display name on every Project.

Example future record:

```json
{
  "id": "komachoe-radio",
  "title": "こまちょえ生ラジオ",
  "description": "...",
  "kind": "broadcast-series"
}
```

Then:

```text
series record
  + projects where publication.seriesKey matches
  → series projection
```

---

# 12. Search contract

Global search should continue to derive searchable Project documents from the content collections.

Adding a Project must not require editing `search.json.ts` unless:

- a genuinely new content entity type is introduced; or
- indexing semantics change for all Projects.

A newly valid Project should automatically contribute:

- project title;
- summary;
- project events;
- person contexts;
- mentions;
- related index context as supported.

---

# 13. People contract

Project-person relationships must remain data-driven.

If a person appears in a Project context record, the person page should derive that backlink.

Do not manually maintain:

```text
Person A:
  - Project X
  - Project Y
```

inside UI code.

The only manual work should be authoring the underlying relationship/context data.

---

# 14. Index contract

Indexes are curated knowledge structures, so they are not identical to automatic series projection.

Use this distinction:

```text
Series
  = mechanical membership via seriesKey

Index
  = editorial/contextual grouping
```

A Project should automatically expose an Index backlink if the Index content references it.

However, creating or updating an Index remains an editorial act.

Do not force every Project into an Index merely to satisfy discoverability.

---

# 15. Project-specific rendering

Current known debt:

```text
project.id === "komatsu36"
  → Komatsu36PeopleView
```

inside the generic Project shell.

Do not prematurely refactor this solely for architectural purity.

Refactor only when at least one additional Project needs a genuinely custom view.

At that point prefer a renderer registry:

```ts
const projectRenderers = {
  komatsu36: {
    people: Komatsu36PeopleView
  }
}
```

or, preferably, a generic view-plugin/slot registry keyed by declared presentation capability.

The key rule is:

> no new project-specific condition for ordinary Projects.

---

# 16. Definition of Done for a new Project

A Project is not "done" merely because `/projects/<slug>` renders.

It is done when all of the following are true:

- [ ] `project.json` exists and validates.
- [ ] Tracks / Acts / Events / People / Sources referenced by the Project validate.
- [ ] `publication.date` is correct.
- [ ] `publication.publishedAt` is set.
- [ ] `publication.updatedAt` is set.
- [ ] `seriesKey` is set when the Project belongs to a known series.
- [ ] `views` reflect actual content rather than template convention.
- [ ] `presentationDensity` is correct if the field is adopted.
- [ ] Project dynamic route renders without special wiring.
- [ ] Project appears in global search automatically.
- [ ] Project appears in Recent Updates based on `updatedAt`.
- [ ] Project enters the correct series projection automatically.
- [ ] People/index backlinks resolve from data.
- [ ] Any homepage prominence is controlled only by Project metadata.
- [ ] Validation succeeds.
- [ ] No new slug-specific branch logic was added unless the Project introduces a genuinely new presentation class.

If any ordinary entry requires source-code registration, treat that as an architecture defect.

---

# 17. Engineering review question

Every PR that introduces a new Project should include this review question:

> Did this PR add any code that exists only to make this specific Project discoverable?

If yes, reviewers should determine whether the code is:

1. a genuinely new reusable capability, or
2. accidental manual wiring.

Case 2 should be rejected and replaced by projection logic.

---

# 18. Target end state

The desired workflow is:

```text
Author Project data
        ↓
Validate
        ↓
Merge
        ↓
All ordinary Reader/site entry points appear automatically
```

not:

```text
Author Project data
        ↓
Patch homepage
        ↓
Patch recent list
        ↓
Patch series
        ↓
Patch search
        ↓
Patch people
        ↓
Patch regression fixture
        ↓
Hope nothing was forgotten
```

Qianqingtie's publication layer should behave like a small content system, not a collection of hand-wired pages.
