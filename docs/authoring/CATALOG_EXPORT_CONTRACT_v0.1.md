# Catalog export contract v0.1

`items.jsonl` 和 `classifications.jsonl` 是机器主数据。导出层只生成 human views，不回写任何 source item。

## Portable views

- `generated/items-view.json`: flattened rows for local renderers and inspection.
- `generated/index.md`: quick human/Git view.
- `generated/catalog-status.json` and `generated/catalog-report.md`: status/quality views.

Rows contain public-safe metadata only: title, date, category, series, game, format, availability, classification source, reviewed flag and provider URL. They never include work-state, download paths, raw yt-dlp observations, cookies or local filesystem paths.

## XLSX

XLSX is a generated human view, not a generic runtime dependency or source of truth. The current synthetic acceptance uses the local artifact-tool renderer and verifies the workbook by table inspection, formula-error scan and PNG render. A future local Workspace runner may materialize `videos.xlsx` from `items-view.json`; GOMYAKU core remains portable without that desktop-only dependency.
