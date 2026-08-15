import { normalizeMediaItem } from '../../normalize/normalizeMediaItem.mjs';

const liveStatuses = new Set(['is_live', 'is_upcoming', 'was_live', 'not_live']);
const availabilityStatuses = new Set(['available', 'private', 'deleted', 'unavailable', 'unknown']);

const asDateTime = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value * 1000).toISOString();
  if (typeof value === 'string' && /^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month, day)).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const flattenEntries = (value) => {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value.entries)) return value.entries.flatMap(flattenEntries);
  return [value];
};

export const buildYtDlpDiscoveryArgs = ({ source, flat = true } = {}) => {
  if (typeof source !== 'string' || !source.trim()) throw new Error('source URL is required');
  return [
    ...(flat ? ['--flat-playlist'] : []),
    '--dump-json',
    '--skip-download',
    source,
  ];
};

export const parseYtDlpJsonLines = (text) => {
  if (typeof text !== 'string') throw new Error('yt-dlp output must be text');
  const observations = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      throw new Error(`yt-dlp output line ${index + 1} is invalid JSON: ${error.message}`);
    }
    observations.push(...flattenEntries(parsed));
  }
  return observations.filter((observation) => observation && (observation.id || observation.display_id));
};

const normalizeLiveStatus = (observation) => {
  if (liveStatuses.has(observation.live_status)) return observation.live_status;
  if (observation.is_live === true) return 'is_live';
  if (observation.was_live === true) return 'was_live';
  if (observation.is_upcoming === true) return 'is_upcoming';
  return 'not_live';
};

const normalizeAvailability = (observation) => {
  if (availabilityStatuses.has(observation.availability)) return observation.availability;
  if (observation.is_private === true) return 'private';
  return 'available';
};

export const normalizeYouTubeObservation = (observation, {
  sourceUrl,
  tab = 'streams',
  now = new Date().toISOString(),
} = {}) => {
  if (!observation || typeof observation !== 'object') throw new Error('YouTube observation must be an object');
  const externalId = observation.id || observation.display_id;
  if (typeof externalId !== 'string' || !externalId.trim()) throw new Error('YouTube observation is missing id');
  const canonicalUrl = observation.webpage_url || `https://www.youtube.com/watch?v=${externalId}`;
  const releaseTimestamp = Number.isFinite(observation.release_timestamp)
    ? Math.trunc(observation.release_timestamp)
    : Number.isFinite(observation.timestamp) ? Math.trunc(observation.timestamp) : undefined;
  const publishedAt = asDateTime(observation.release_timestamp ?? observation.timestamp ?? observation.upload_date);
  const durationMs = Number.isFinite(observation.duration) ? Math.max(0, Math.round(observation.duration * 1000)) : undefined;
  const liveStatus = normalizeLiveStatus(observation);
  const source = {
    ...(observation.channel_id ? { channelId: observation.channel_id } : {}),
    ...(observation.channel || observation.uploader ? { channelName: observation.channel || observation.uploader } : {}),
    tab,
    url: sourceUrl || canonicalUrl,
  };
  return normalizeMediaItem({
    externalId,
    url: canonicalUrl,
    title: observation.title || externalId,
    ...(observation.description ? { description: observation.description } : {}),
    ...(publishedAt ? { publishedAt } : {}),
    ...(releaseTimestamp !== undefined ? { releaseTimestamp } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    mediaType: observation.media_type || (liveStatus === 'not_live' ? 'video' : 'livestream'),
    liveStatus,
    availability: { status: normalizeAvailability(observation) },
    source,
    raw: { providerObservationRef: `raw/yt-dlp/${externalId}.json` },
  }, { provider: 'youtube', now });
};

export const createYouTubeCatalogProvider = ({ run, now = () => new Date().toISOString() } = {}) => ({
  provider: 'youtube',
  async discover({ source, tab = 'streams' }) {
    if (typeof run !== 'function') throw new Error('YouTube provider requires an explicit yt-dlp runner');
    const output = await run(buildYtDlpDiscoveryArgs({ source }));
    return parseYtDlpJsonLines(output).map((observation) => normalizeYouTubeObservation(observation, {
      sourceUrl: source,
      tab,
      now: now(),
    }));
  },
});
