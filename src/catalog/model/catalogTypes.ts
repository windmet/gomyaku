export type AvailabilityStatus = 'available' | 'private' | 'deleted' | 'unavailable' | 'unknown';

export type MediaType = 'video' | 'livestream' | 'audio' | 'unknown';

export type LiveStatus = 'is_live' | 'is_upcoming' | 'was_live' | 'not_live' | 'unknown';

export interface MediaItemSource {
  channelId?: string;
  channelName?: string;
  tab?: string;
  url: string;
}

export interface MediaItemAvailability {
  status: AvailabilityStatus;
  observedAt?: string;
}

export interface MediaItemObservation {
  firstSeenAt: string;
  lastCheckedAt: string;
}

export interface MediaItemRawReference {
  providerObservationRef?: string;
}

export interface MediaItem {
  schemaVersion: 1;
  id: string;
  provider: string;
  externalId: string;
  source: MediaItemSource;
  url: string;
  title: string;
  description?: string;
  publishedAt?: string;
  releaseTimestamp?: number;
  durationMs?: number;
  mediaType: MediaType;
  liveStatus: LiveStatus;
  availability: MediaItemAvailability;
  observed: MediaItemObservation;
  raw?: MediaItemRawReference;
}

export interface CatalogDescriptor {
  schemaVersion: 1;
  id: string;
  provider: string;
  source: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogWorkspacePaths {
  root: string;
  descriptor: string;
  items: string;
  classifications: string;
  overrides: string;
  workState: string;
  raw: string;
  generated: string;
}

export interface CatalogSyncReport {
  scanned: number;
  added: number;
  updated: number;
  unchanged: number;
  rejected: number;
}
