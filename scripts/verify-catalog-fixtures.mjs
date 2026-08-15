import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assertMediaItem,
  buildYtDlpDiscoveryArgs,
  buildCatalogRows,
  classifyCatalog,
  createYouTubeCatalogProvider,
  mergeMediaItems,
  normalizeMediaItem,
  normalizeYouTubeObservation,
  parseYtDlpJsonLines,
  summarizeCatalog,
  validateCatalogData,
  renderCatalogMarkdown,
  queryCatalog,
  renderCatalogQueryMarkdown,
  buildProjectMaterializationPlan,
  buildAcquisitionPlan,
  validateWorkState,
  validateWorkStateRows,
  buildSourceSetReviewPlan,
} from '../src/index.mjs';
import {
  createCatalogWorkspacePaths,
  initializeCatalogWorkspace,
  readMediaItems,
  writeMediaItems,
} from '../src/catalog/workspace/catalogWorkspace.mjs';

const fixturePath = path.resolve('tests/fixtures/catalog/youtube-flat.jsonl');
const fixtureText = await readFile(fixturePath, 'utf8');
const rulesDocument = JSON.parse(await readFile(path.resolve('tests/fixtures/catalog/rules.yaml'), 'utf8'));
const overridesDocument = JSON.parse(await readFile(path.resolve('tests/fixtures/catalog/overrides.yaml'), 'utf8'));
const observations = parseYtDlpJsonLines(fixtureText);
if (observations.length !== 2) throw new Error(`expected 2 synthetic observations, got ${observations.length}`);

const now = '2026-08-15T00:00:00.000Z';
const normalized = observations.map((observation) => normalizeYouTubeObservation(observation, {
  sourceUrl: 'https://www.youtube.com/@synthetic/streams',
  now,
}));
normalized.forEach(assertMediaItem);
const generic = normalizeMediaItem({
  externalId: 'generic001',
  url: 'https://example.test/media/generic001',
  title: 'Generic synthetic media',
  mediaType: 'video',
  liveStatus: 'not_live',
  availability: { status: 'available' },
  source: { url: 'https://example.test/catalog' },
}, { provider: 'fixture', now });
assertMediaItem(generic);
if (normalized[0].id !== 'youtube:synthetic001') throw new Error('stable provider id was not normalized');
if (normalized[0].durationMs !== 3_600_000) throw new Error('duration seconds were not normalized to milliseconds');
if (normalized[1].publishedAt !== '2026-08-15T00:00:00.000Z') throw new Error('upload_date was not normalized');
const flatPlaylistFallback = normalizeYouTubeObservation({
  id: 'playlist-fallback',
  title: 'Flat playlist fallback',
  playlist_channel_id: 'UCplaylist',
  playlist_channel: 'Playlist Channel',
  webpage_url: 'https://www.youtube.com/watch?v=playlist-fallback',
  duration: 12,
  live_status: 'was_live',
}, { sourceUrl: 'https://www.youtube.com/@synthetic/streams', now });
if (flatPlaylistFallback.source.channelId !== 'UCplaylist' || flatPlaylistFallback.source.channelName !== 'Playlist Channel') {
  throw new Error('flat playlist channel fallback was not normalized');
}

const nested = parseYtDlpJsonLines(JSON.stringify({ entries: JSON.parse(`[${fixtureText.trim().replace(/\n/g, ',')}]`) }));
if (nested.length !== 2) throw new Error('nested yt-dlp entries were not flattened');

const args = buildYtDlpDiscoveryArgs({ source: 'https://www.youtube.com/@synthetic/streams' });
if (!args.includes('--flat-playlist') || !args.includes('--skip-download')) throw new Error('yt-dlp discovery args are incomplete');

const provider = createYouTubeCatalogProvider({ run: async () => fixtureText, now: () => now });
const discovered = await provider.discover({ source: 'https://www.youtube.com/@synthetic/streams' });
if (JSON.stringify(discovered) !== JSON.stringify(normalized)) throw new Error('provider discovery is not deterministic');

const firstMerge = mergeMediaItems([], discovered);
if (firstMerge.report.added !== 2 || firstMerge.report.scanned !== 2) throw new Error('initial catalog merge report is incorrect');
const secondMerge = mergeMediaItems(firstMerge.items, discovered);
if (secondMerge.report.unchanged !== 2 || secondMerge.report.added !== 0) throw new Error('repeat catalog merge is not idempotent');

const firstClassification = classifyCatalog({
  items: firstMerge.items,
  rulesDocument,
  overridesDocument,
});
if (firstClassification.report.new !== 2) throw new Error('initial classification diff must report two new items');
if (firstClassification.report.overridden !== 1) throw new Error('manual override did not win over rules');
if (firstClassification.report.unclassified !== 0 || firstClassification.report.conflict !== 0) {
  throw new Error('synthetic classification coverage is incomplete');
}
const streamClassification = firstClassification.classifications.find((item) => item.item === 'youtube:synthetic001');
if (streamClassification.primaryCategory !== 'radio' || streamClassification.series?.id !== 'synthetic-radio') {
  throw new Error('rule-based series classification failed');
}
const videoClassification = firstClassification.classifications.find((item) => item.item === 'youtube:synthetic002');
if (videoClassification.primaryCategory !== 'event' || videoClassification.classification.source !== 'override') {
  throw new Error('reviewed override was not applied');
}
const repeatedClassification = classifyCatalog({
  items: firstMerge.items,
  rulesDocument,
  overridesDocument,
  existing: firstClassification.classifications,
});
if (repeatedClassification.report.unchanged !== 2 || repeatedClassification.diff.length !== 0) {
  throw new Error('repeat classification is not deterministic');
}
const conflictClassification = classifyCatalog({
  items: [firstMerge.items[0]],
  rulesDocument: {
    schemaVersion: 1,
    rules: [
      { id: 'conflict-a', priority: 50, when: { provider: 'youtube' }, set: { primaryCategory: 'one' } },
      { id: 'conflict-b', priority: 50, when: { provider: 'youtube' }, set: { primaryCategory: 'two' } },
    ],
  },
  overridesDocument: { schemaVersion: 1, overrides: {} },
});
if (conflictClassification.report.conflict !== 1) throw new Error('same-priority scalar conflict was not surfaced');

const status = summarizeCatalog({
  items: firstMerge.items,
  classifications: firstClassification.classifications,
  workState: [],
});
if (status.itemCount !== 2 || status.metadataComplete !== 2) throw new Error('catalog status item counts are incorrect');
if (status.primaryCategories.radio !== 1 || status.primaryCategories.event !== 1) {
  throw new Error('catalog status category counts are incorrect');
}
if (!status.dataQuality.valid) throw new Error(`synthetic catalog quality failed: ${status.dataQuality.failures.join('; ')}`);
const leakingItems = [{ ...firstMerge.items[0], description: 'C:\\private\\source.wav' }];
const leakCheck = validateCatalogData({ items: leakingItems, classifications: [] });
if (leakCheck.valid || !leakCheck.failures.some((failure) => failure.includes('local path'))) {
  throw new Error('canonical local-path leak was not rejected');
}
const badReference = validateCatalogData({
  items: firstMerge.items,
  classifications: [{ ...firstClassification.classifications[0], item: 'youtube:missing' }],
});
if (badReference.valid || !badReference.failures.some((failure) => failure.includes('unknown item'))) {
  throw new Error('unknown classification reference was not rejected');
}
const rows = buildCatalogRows(firstMerge.items, firstClassification.classifications);
if (rows.length !== 2 || rows[0].url !== 'https://www.youtube.com/watch?v=synthetic001') {
  throw new Error('catalog export rows are incomplete');
}
const markdown = renderCatalogMarkdown(rows, { label: 'Synthetic Catalog', generatedAt: now });
if (!markdown.includes('| Title |') || !markdown.includes('Synthetic archive stream one')) {
  throw new Error('catalog Markdown export is incomplete');
}
const syntheticWorkState = [
  {
    schemaVersion: 1,
    item: 'youtube:synthetic001',
    audio: { status: 'downloaded' },
    transcript: { status: 'missing' },
    project: { status: 'materialized' },
    publication: { status: 'draft', candidate: true },
    evidence: ['fixtures/synthetic001/project.yaml'],
  },
  {
    schemaVersion: 1,
    item: 'youtube:synthetic002',
    audio: { status: 'missing' },
    transcript: { status: 'baseline-complete' },
    project: { status: 'not-materialized' },
    publication: { status: 'not-started', candidate: false },
    evidence: ['fixtures/synthetic002/project.yaml'],
  },
];
if (!validateWorkState(syntheticWorkState[0]).valid
  || !validateWorkStateRows(syntheticWorkState, { knownItemIds: new Set(firstMerge.items.map((item) => item.id)) }).valid) {
  throw new Error('synthetic Work State contract is invalid');
}
const invalidWorkState = validateWorkStateRows([
  { schemaVersion: 1, item: 'youtube:synthetic001', evidence: [] },
  { schemaVersion: 1, item: 'youtube:synthetic001', evidence: ['../private/state.json'] },
]);
if (invalidWorkState.valid
  || !invalidWorkState.failures.some((failure) => failure.includes('evidence must be a non-empty array'))
  || !invalidWorkState.failures.some((failure) => failure.includes('duplicate Work State item'))
  || !invalidWorkState.failures.some((failure) => failure.includes('must be workspace-relative'))) {
  throw new Error('invalid Work State rows were not rejected');
}
const allQuery = queryCatalog({
  items: firstMerge.items,
  classifications: firstClassification.classifications,
  workState: syntheticWorkState,
});
if (allQuery.matched !== 2 || allQuery.rows[0].item.id !== 'youtube:synthetic002') {
  throw new Error('catalog query default ordering is incorrect');
}
const radioQuery = queryCatalog({
  items: firstMerge.items,
  classifications: firstClassification.classifications,
  workState: syntheticWorkState,
  query: { category: 'radio', audioStatus: 'downloaded', publicationCandidate: true },
});
if (radioQuery.matched !== 1 || radioQuery.rows[0].item.id !== 'youtube:synthetic001') {
  throw new Error('catalog query category/work-state filters failed');
}
const queryMarkdown = renderCatalogQueryMarkdown(radioQuery, { label: 'Synthetic query' });
if (!queryMarkdown.includes('Synthetic archive stream one') || !queryMarkdown.includes('downloaded')) {
  throw new Error('catalog query Markdown export is incomplete');
}
const unknownStatusQuery = queryCatalog({
  items: firstMerge.items,
  classifications: firstClassification.classifications,
  workState: [syntheticWorkState[0]],
  query: { transcriptStatus: 'unknown' },
});
if (unknownStatusQuery.matched !== 1 || unknownStatusQuery.rows[0].item.id !== 'youtube:synthetic002') {
  throw new Error('catalog query missing Work State must be surfaced as unknown');
}
const materializationPlan = buildProjectMaterializationPlan({
  catalog: {
    id: 'synthetic-youtube',
    provider: 'youtube',
    source: 'https://www.youtube.com/@synthetic/streams',
  },
  item: firstMerge.items[0],
  classification: firstClassification.classifications.find((entry) => entry.item === firstMerge.items[0].id),
  projectId: 'synthetic-stream-project',
  selectionReason: 'Synthetic acceptance fixture selection',
  snapshotId: '2026-08-15-r1',
});
if (materializationPlan.kind !== 'project-materialization-plan'
  || materializationPlan.origin.mediaItemId !== 'youtube:synthetic001'
  || materializationPlan.project.status !== 'planned'
  || materializationPlan.project.root !== undefined
  || materializationPlan.selection.sourceSet.kind !== 'single'
  || materializationPlan.selection.requiresExplicitAcquisition !== true) {
  throw new Error('project materialization plan contract is incomplete');
}
const multiMaterializationPlan = buildProjectMaterializationPlan({
  catalog: {
    id: 'synthetic-youtube',
    provider: 'youtube',
    source: 'https://www.youtube.com/@synthetic/streams',
  },
  items: firstMerge.items,
  classifications: firstClassification.classifications,
  projectId: 'synthetic-multi-source-project',
  selectionReason: 'Synthetic explicit multi-source source-set selection',
});
if (multiMaterializationPlan.origin.mediaItemId !== undefined
  || JSON.stringify(multiMaterializationPlan.origin.mediaItemIds) !== JSON.stringify(firstMerge.items.map((item) => item.id))
  || multiMaterializationPlan.sources?.length !== 2
  || multiMaterializationPlan.classifications?.length !== 2
  || multiMaterializationPlan.selection.sourceSet.kind !== 'multi') {
  throw new Error('explicit multi-source materialization plan contract is incomplete');
}
const sourceSetReviewPlan = buildSourceSetReviewPlan({
  projectId: 'synthetic-cross-provider-project',
  selectionReason: 'Synthetic explicit cross-provider review',
  sources: [
    {
      id: 'youtube:synthetic001',
      provider: 'youtube',
      externalId: 'synthetic001',
      origin: 'catalog',
      catalogItemId: 'youtube:synthetic001',
      url: 'https://www.youtube.com/watch?v=synthetic001',
      urlEvidence: ['https://www.youtube.com/watch?v=synthetic001'],
      evidence: ['catalog/items.jsonl'],
    },
    {
      id: 'x-space:synthetic-space',
      provider: 'x-space',
      externalId: 'synthetic-space',
      origin: 'explicit',
      evidence: ['project/source-set-notes.md'],
    },
  ],
});
if (sourceSetReviewPlan.kind !== 'source-set-review-plan'
  || sourceSetReviewPlan.selection.sourceSetKind !== 'multi'
  || sourceSetReviewPlan.sources[1].urlStatus !== 'unresolved'
  || sourceSetReviewPlan.sources[0].urlEvidence?.length !== 1
  || sourceSetReviewPlan.review.status !== 'pending'
  || sourceSetReviewPlan.selection.inference !== 'disabled') {
  throw new Error('cross-provider source-set review plan contract is incomplete');
}
let sourceSetRejected = false;
try {
  buildSourceSetReviewPlan({
    projectId: 'synthetic-invalid',
    selectionReason: 'invalid fixture',
    sources: [{
      id: 'x-space:invalid',
      provider: 'x-space',
      externalId: 'invalid',
      origin: 'explicit',
      evidence: ['C:\\private\\source.md'],
    }],
  });
} catch (error) {
  sourceSetRejected = error.message.includes('workspace-relative');
}
if (!sourceSetRejected) throw new Error('source-set absolute evidence path was not rejected');
const acquisitionPlan = buildAcquisitionPlan({
  catalog: {
    id: 'synthetic-youtube',
    provider: 'youtube',
    source: 'https://www.youtube.com/@synthetic/streams',
  },
  items: firstMerge.items,
  classifications: firstClassification.classifications,
  workState: syntheticWorkState,
  itemIds: ['youtube:synthetic001'],
  artifacts: ['audio', 'chat', 'comments'],
  planId: 'synthetic-acquisition-r1',
  selectionReason: 'Synthetic acceptance fixture selection',
});
if (acquisitionPlan.kind !== 'acquisition-plan'
  || acquisitionPlan.requests.length !== 1
  || acquisitionPlan.requests[0].artifacts.length !== 3
  || acquisitionPlan.execution.status !== 'not-executed'
  || acquisitionPlan.execution.explicitApprovalRequired !== true) {
  throw new Error('acquisition plan contract is incomplete');
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'gomyaku-catalog-fixture-'));
try {
  const descriptor = {
    schemaVersion: 1,
    id: 'synthetic-youtube',
    provider: 'youtube',
    source: 'https://www.youtube.com/@synthetic/streams',
    label: 'Synthetic YouTube catalog',
    createdAt: now,
    updatedAt: now,
  };
  const paths = await initializeCatalogWorkspace({ workspace: tempRoot, descriptor });
  if (!paths.descriptor.endsWith('catalog.yaml')) throw new Error('workspace descriptor must be catalog.yaml');
  await writeMediaItems(paths.items, firstMerge.items);
  const roundTrip = await readMediaItems(paths.items);
  if (JSON.stringify(roundTrip) !== JSON.stringify(firstMerge.items)) throw new Error('items.jsonl round-trip changed data');
  const layout = createCatalogWorkspacePaths(tempRoot);
  if (layout.raw === layout.generated) throw new Error('raw and generated workspace boundaries collapsed');
  if (!layout.rules.endsWith('rules.yaml')) throw new Error('workspace rules path is missing');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log('GOMYAKU catalog synthetic fixtures verified (workspace, normalization, provider seam, and idempotent merge).');
