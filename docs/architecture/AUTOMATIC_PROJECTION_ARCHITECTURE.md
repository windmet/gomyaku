# Qianqingtie Automatic Projection Architecture

> Companion document to `PROJECT_ONBOARDING_CONTRACT.md`.

This document specifies how Project content should be projected into public site surfaces.

---

# 1. Desired architecture

The target architecture should be:

```text
Content Collections
        │
        ▼
Normalized Project Records
        │
        ├── Project Reader projection
        ├── Home projection
        ├── Recent-update projection
        ├── Series projection
        ├── Search projection
        ├── People projection
        ├── Index backlinks
        └── Site metadata / sitemap
```

Each surface should consume normalized data.

No surface should maintain its own list of known Project slugs.

---

# 2. Introduce one normalized publication model

Today several surfaces can independently interpret Project metadata.

Instead, define one helper layer.

Suggested location:

```text
src/lib/projectCatalog.ts
```

Possible interface:

```ts
export interface ProjectCatalogItem {
  id: string
  title: string
  summary?: string

  sourceDate: string
  publishedAt: string
  updatedAt: string

  kind: "special" | "episode"
  seriesKey?: string

  views: string[]
  presentationDensity: "compact" | "standard" | "feature"

  homeOrder?: number
  homeDeck?: string
}
```

Builder:

```ts
export function buildProjectCatalog(
  projects: CollectionEntry<"projects">[]
): ProjectCatalogItem[]
```

All publication surfaces should consume this normalized catalog or functions derived from it.

---

# 3. Avoid many competing projection implementations

Bad:

```text
index.astro parses publication metadata itself
search.json.ts parses it differently
series page parses it again
people route contains another special sort
```

Good:

```text
projectCatalog
  ↓
homeProjection
searchProjection
seriesProjection
peopleProjection
```

The normalized layer should not contain UI markup.

---

# 4. Recommended projection modules

Suggested structure:

```text
src/lib/
  projectCatalog.ts
  homeProjection.ts
  recentProjection.ts
  seriesProjection.ts
  searchProjection.ts
  peopleProjection.ts
```

This does not require over-fragmenting immediately.

A smaller initial version is acceptable:

```text
projectCatalog.ts
homeProjection.ts
seriesProjection.ts
```

Search/people can keep current files if they already consume collection data correctly.

The important requirement is shared semantics, not file count.

---

# 5. Home projection

Recommended API:

```ts
buildHomeProjection({
  projects,
  indexes,
  posts,
  people
})
```

Return separate concepts:

```ts
{
  featuredProjects,
  recentUpdates,
  recentSourceItems,
  ...
}
```

Do not return a single ambiguously named "recent" array.

---

## 5.1 Featured Projects

Derive from metadata:

```ts
const featuredProjects = catalog
  .filter(project => project.homeOrder !== undefined)
  .sort((a, b) => a.homeOrder - b.homeOrder)
```

This is a curriculum/editorial ordering.

It is NOT chronological.

---

## 5.2 Recent Updates

Derive from:

```ts
updatedAt
```

Sort:

```ts
DESC
```

Display both timestamps when useful:

```text
更新 2026.08.17
节目 2026.08.09
```

This prevents the current UX ambiguity where a recently authored archive may appear old because its program happened months earlier.

---

## 5.3 Source chronology

If the homepage or an archive page needs "latest programs/events", use:

```ts
publication.date
```

Do not overload "Recent Updates" for this.

---

# 6. Series projection

Suggested API:

```ts
buildSeriesProjection(projects, seriesMetadata)
```

For every `seriesKey`, derive:

```ts
{
  key,
  metadata,
  projects,
  count,
  latest,
  first,
}
```

For a particular Project:

```ts
getSeriesContext(projectId)
```

returns:

```ts
{
  series,
  previousProject,
  nextProject,
  position,
  total
}
```

Sorting should use:

```text
publication.date ASC
```

with a stable secondary key such as Project ID.

---

# 7. Search projection

The current search architecture already derives content from collections.

Keep that behavior.

The rule to enforce is:

> Search indexes entity types, not hardcoded Project IDs.

When a Project is added, search should change only because collection data changed.

Add a validation assertion:

```text
every published Project ID appears exactly once as a Project search document
```

This is stronger than manually checking a few slugs.

---

# 8. People projection

For every known person, derive Project backlinks from Project-person data.

Add validation:

```text
for every published Project person relation:
  referenced person exists
  project exists
  person route can derive the relation
```

Do not require manual addition to a people landing page.

---

# 9. Index backlinks

Indexes are editorial, but their backlinks should still be mechanically derived.

If an Index contains Project references:

```text
index → project
```

the Project Reader can derive:

```text
project → related indexes
```

through reverse projection.

Do not duplicate the relationship in both content files.

---

# 10. Presentation density derivation

Two acceptable approaches exist.

## Option A — explicit field

```json
{
  "publication": {
    "presentationDensity": "compact"
  }
}
```

Advantages:

- editorially obvious;
- predictable;
- easy for agent authoring;
- no hidden thresholds.

Recommended for qianqingtie.

---

## Option B — derived heuristic

Example:

```text
if views <= 3 and duration < X:
  compact
```

Not recommended as the main source of truth.

Content importance and presentation density cannot always be inferred from duration.

---

# 11. Reader navigation layout

The Reader nav must work for variable view counts.

Avoid styling that implies an expected fixed number of tabs.

Recommended behavior:

```text
2–3 views → intrinsic-width / centered group
4–5 views → normal row
overflow → horizontal scroll or wrap according to breakpoint
```

For Compact Projects, a three-item nav should look intentional rather than incomplete.

---

# 12. Schema validation changes

Update `content.config.ts` publication schema with:

```ts
publishedAt
updatedAt
homeOrder?
presentationDensity?
```

Recommended checks:

```text
publishedAt matches YYYY-MM-DD
updatedAt matches YYYY-MM-DD
updatedAt >= publishedAt
```

Potential warning, not hard error:

```text
publication.date > publishedAt
```

This can happen if future events are pre-authored, so treat carefully.

If `homeOrder` is present:

```text
must be finite integer
must be unique among curated published Projects
```

---

# 13. Publication status

If the core schema already has a status field, define a single helper:

```ts
isPublicProject(project)
```

Every public projection must call the same helper.

Never let homepage/search/series each invent different rules for draft visibility.

Example:

```ts
export function isPublicProject(project) {
  return project.data.status === "published"
}
```

Use the actual accepted status vocabulary from Gomyaku.

---

# 14. Validation strategy

The validation suite should test invariants rather than enumerate every Project.

Recommended invariant tests:

## Catalog completeness

```text
all published Projects produce one catalog item
```

## Dynamic route closure

```text
all published Project IDs are valid route slugs
```

## Home projection

```text
featured projects are sorted by homeOrder
recent updates are sorted by updatedAt
```

## Search closure

```text
all published Projects appear in project search documents
```

## Series closure

```text
all Projects with a seriesKey are present in the corresponding series projection
```

## People closure

```text
all project-person references resolve
```

## Index closure

```text
all index-project references resolve
```

---

# 15. Golden presentation fixtures

Do NOT add one full regression script for every Project forever.

Maintain one representative fixture per presentation class:

```text
Feature
Standard Episode
Compact Episode
```

Recommended real-world representatives:

```text
Feature:
  komatsu36

Standard:
  komachoe-20260729
  or a synthetic stable fixture

Compact:
  gouriteki-20260809
```

Project-specific regressions should exist only for genuinely unique behavior.

For example:

```text
Komatsu36 custom People view
```

is a valid special regression.

"Project appears on homepage" is not.

---

# 16. Suggested validator additions

Possible scripts:

```text
scripts/verify-project-catalog.mjs
scripts/verify-home-projection.mjs
scripts/verify-series-projection.mjs
scripts/verify-project-discoverability.mjs
```

The most important new one is:

```text
verify-project-discoverability
```

Pseudo logic:

```ts
for (const project of publishedProjects) {
  assert(projectCatalog.has(project.id))
  assert(searchProjectIds.has(project.id))

  if (project.seriesKey) {
    assert(seriesProjection[project.seriesKey].includes(project.id))
  }

  if (project.homeOrder !== undefined) {
    assert(homeFeaturedIds.includes(project.id))
  }

  assert(recentUpdateIds.includes(project.id))
}
```

This turns "Did we forget an entry?" into a machine-checkable invariant.

---

# 17. CI failure philosophy

A new Project PR should fail CI if:

- Project content exists but no catalog item can be built;
- publication timestamps are absent;
- a seriesKey points to invalid metadata;
- homeOrder conflicts;
- Project is published but missing from search projection;
- Project relations are broken.

CI should NOT fail merely because:

- the Project has only three views;
- it lacks a Sections view;
- it is not featured;
- it is not part of an editorial Index.

Those are valid content decisions.

---

# 18. Expected developer workflow after implementation

New Project creation becomes:

```text
1. Create project content
2. Fill publication metadata
3. Add actual project relations/content
4. Run validation
5. Preview Reader
6. Merge
```

No separate "entry implementation branch" should exist.

If the author must patch `index.astro`, `RecentFeed.astro`, search code, or series code for an ordinary Project, the automation contract has failed.

---

# 19. Non-goals

This work should NOT introduce:

- a CMS;
- a database;
- account/login state;
- a relationship graph;
- a generic plugin system for every component;
- automatic editorial Index generation;
- Git-history-derived publication metadata.

The goal is narrower:

> make the current data-first architecture behave consistently like one.
