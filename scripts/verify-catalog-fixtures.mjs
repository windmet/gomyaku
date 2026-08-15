import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assertMediaItem,
  buildYtDlpDiscoveryArgs,
  createYouTubeCatalogProvider,
  mergeMediaItems,
  normalizeMediaItem,
  normalizeYouTubeObservation,
  parseYtDlpJsonLines,
} from '../src/index.mjs';
import {
  createCatalogWorkspacePaths,
  initializeCatalogWorkspace,
  readMediaItems,
  writeMediaItems,
} from '../src/catalog/workspace/catalogWorkspace.mjs';

const fixturePath = path.resolve('tests/fixtures/catalog/youtube-flat.jsonl');
const fixtureText = await readFile(fixturePath, 'utf8');
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
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log('GOMYAKU catalog synthetic fixtures verified (workspace, normalization, provider seam, and idempotent merge).');
