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
  rules: string;
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

export interface CatalogClassification {
  schemaVersion: 1;
  item: string;
  primaryCategory: string | null;
  series: { id: string; label: string } | null;
  game: string | null;
  format: string[];
  people: Array<{ personId: string; role: string }>;
  topics: string[];
  tags: string[];
  classification: {
    source: 'rule' | 'override' | 'unclassified' | 'conflict';
    ruleIds: string[];
    reviewed: boolean;
    overrideReason?: string | null;
    conflicts: Array<{
      field: string;
      priority: number;
      candidates: Array<{ ruleId: string; value: unknown }>;
    }>;
  };
}

export interface CatalogClassificationReport {
  items: number;
  new: number;
  changed: number;
  unchanged: number;
  conflict: number;
  unclassified: number;
  overridden: number;
}

export interface CatalogStatusSummary {
  itemCount: number;
  metadataComplete: number;
  availability: Record<string, number>;
  mediaTypes: Record<string, number>;
  classification: {
    classified: number;
    unclassified: number;
    conflict: number;
    overridden: number;
  };
  primaryCategories: Record<string, number>;
  distinctSeries: number;
  distinctGames: number;
  workStateCount: number;
  dataQuality: { valid: boolean; failures: string[] };
}
