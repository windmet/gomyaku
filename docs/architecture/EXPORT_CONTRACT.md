# Portable archive export contract v0.1

`compileProject()` accepts a canonical archive package and returns a stable
JSON-compatible portable package. It validates reference closure, sorts entity
arrays deterministically, excludes withheld events, and rejects local
filesystem/private-evidence fields.

The compiler does not generate Astro, HTML, or a site route. A publication
consumer decides how the portable package is rendered and what editorial copy
is shown.
