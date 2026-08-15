const availabilityStatuses = new Set(['available', 'private', 'deleted', 'unavailable', 'unknown']);
const mediaTypes = new Set(['video', 'livestream', 'audio', 'unknown']);
const liveStatuses = new Set(['is_live', 'is_upcoming', 'was_live', 'not_live', 'unknown']);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const isUrl = (value) => {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
};

const isDateTime = (value) => isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

const pushRequiredString = (failures, value, label) => {
  if (!isNonEmptyString(value)) failures.push(`${label} must be a non-empty string`);
};

export const validateMediaItem = (item) => {
  const failures = [];
  if (!item || typeof item !== 'object') return { valid: false, failures: ['item must be an object'] };
  if (item.schemaVersion !== 1) failures.push('schemaVersion must be 1');
  pushRequiredString(failures, item.id, 'id');
  pushRequiredString(failures, item.provider, 'provider');
  pushRequiredString(failures, item.externalId, 'externalId');
  pushRequiredString(failures, item.title, 'title');
  if (!isUrl(item.url)) failures.push('url must be an absolute URL');
  if (!item.source || typeof item.source !== 'object') failures.push('source must be an object');
  else if (!isUrl(item.source.url)) failures.push('source.url must be an absolute URL');
  if (!mediaTypes.has(item.mediaType)) failures.push(`mediaType is invalid: ${item.mediaType}`);
  if (!liveStatuses.has(item.liveStatus)) failures.push(`liveStatus is invalid: ${item.liveStatus}`);
  if (!item.availability || !availabilityStatuses.has(item.availability.status)) {
    failures.push('availability.status is invalid');
  }
  if (!item.observed || !isDateTime(item.observed.firstSeenAt) || !isDateTime(item.observed.lastCheckedAt)) {
    failures.push('observed.firstSeenAt and observed.lastCheckedAt must be date-times');
  }
  if (item.publishedAt !== undefined && !isDateTime(item.publishedAt)) failures.push('publishedAt must be a date-time');
  if (item.releaseTimestamp !== undefined && (!Number.isInteger(item.releaseTimestamp) || item.releaseTimestamp < 0)) {
    failures.push('releaseTimestamp must be a non-negative integer');
  }
  if (item.durationMs !== undefined && (!Number.isInteger(item.durationMs) || item.durationMs < 0)) {
    failures.push('durationMs must be a non-negative integer');
  }
  if (item.id !== `${item.provider}:${item.externalId}`) failures.push('id must equal provider:externalId');
  return { valid: failures.length === 0, failures };
};

export const assertMediaItem = (item) => {
  const result = validateMediaItem(item);
  if (!result.valid) throw new Error(result.failures.join('; '));
  return item;
};

export const validateCatalogDescriptor = (descriptor) => {
  const failures = [];
  if (!descriptor || typeof descriptor !== 'object') return { valid: false, failures: ['descriptor must be an object'] };
  if (descriptor.schemaVersion !== 1) failures.push('schemaVersion must be 1');
  pushRequiredString(failures, descriptor.id, 'id');
  pushRequiredString(failures, descriptor.provider, 'provider');
  pushRequiredString(failures, descriptor.source, 'source');
  pushRequiredString(failures, descriptor.label, 'label');
  if (!isDateTime(descriptor.createdAt)) failures.push('createdAt must be a date-time');
  if (!isDateTime(descriptor.updatedAt)) failures.push('updatedAt must be a date-time');
  return { valid: failures.length === 0, failures };
};

export const assertCatalogDescriptor = (descriptor) => {
  const result = validateCatalogDescriptor(descriptor);
  if (!result.valid) throw new Error(result.failures.join('; '));
  return descriptor;
};
