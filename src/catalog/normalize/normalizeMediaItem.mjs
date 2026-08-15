export const normalizeMediaItem = (observation, {
  provider,
  sourceUrl,
  tab,
  now = new Date().toISOString(),
} = {}) => {
  if (!observation || typeof observation !== 'object') throw new Error('provider observation must be an object');
  if (typeof provider !== 'string' || !provider.trim()) throw new Error('provider is required');
  const externalId = observation.externalId || observation.id;
  if (typeof externalId !== 'string' || !externalId.trim()) throw new Error('provider observation is missing externalId');
  const url = observation.url || sourceUrl;
  if (typeof url !== 'string' || !url.trim()) throw new Error('provider observation is missing url');
  const source = {
    ...(observation.source || {}),
    ...(tab ? { tab } : {}),
    url: observation.source?.url || sourceUrl || url,
  };
  return {
    schemaVersion: 1,
    id: `${provider}:${externalId}`,
    provider,
    externalId,
    source,
    url,
    title: observation.title || externalId,
    ...(observation.description ? { description: observation.description } : {}),
    ...(observation.publishedAt ? { publishedAt: observation.publishedAt } : {}),
    ...(observation.releaseTimestamp !== undefined ? { releaseTimestamp: observation.releaseTimestamp } : {}),
    ...(observation.durationMs !== undefined ? { durationMs: observation.durationMs } : {}),
    mediaType: observation.mediaType || 'unknown',
    liveStatus: observation.liveStatus || 'unknown',
    availability: { status: observation.availability?.status || 'unknown', observedAt: now },
    observed: { firstSeenAt: now, lastCheckedAt: now },
    raw: observation.raw || {},
  };
};
