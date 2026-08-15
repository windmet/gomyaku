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

export interface CatalogQuery {
  provider?: string | string[];
  availability?: AvailabilityStatus | AvailabilityStatus[];
  category?: string | string[];
  primaryCategory?: string | string[];
  series?: string | string[];
  game?: string | string[];
  format?: string | string[];
  person?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  audioStatus?: string | string[];
  transcriptStatus?: string | string[];
  projectStatus?: string | string[];
  publicationCandidate?: boolean;
}

export interface CatalogQueryRow {
  item: MediaItem;
  classification: CatalogClassification | null;
  workState: CatalogWorkState | null;
}

export interface CatalogWorkStateSection {
  status: string;
  [key: string]: unknown;
}

export interface CatalogWorkState {
  schemaVersion: 1;
  item: string;
  metadata?: CatalogWorkStateSection;
  audio?: CatalogWorkStateSection;
  video?: CatalogWorkStateSection;
  chat?: CatalogWorkStateSection;
  comments?: CatalogWorkStateSection;
  transcript?: CatalogWorkStateSection;
  project?: CatalogWorkStateSection;
  publication?: CatalogWorkStateSection & { candidate?: boolean };
  sourceEngineering?: CatalogWorkStateSection;
  evidence: string[];
}

export interface WorkStateUpdatePlan {
  schemaVersion: 1;
  kind: 'work-state-update-plan';
  planId: string;
  origin: { acquisitionPlanId: string; acquisitionReceiptPlanId: string };
  review: {
    status: 'pending';
    requiresHumanConfirmation: true;
    workStateMutation: 'separate-apply-step';
  };
  updates: Array<Record<string, unknown>>;
  nextSteps: string[];
}

export interface SourceSetReviewPlan {
  schemaVersion: 1;
  kind: 'source-set-review-plan';
  planId: string;
  project: { id: string };
  selection: {
    reason: string;
    sourceCount: number;
    sourceSetKind: 'single' | 'multi';
    inference: 'disabled';
  };
  sources: Array<{
    id: string;
    provider: string;
    externalId: string;
    origin: 'catalog' | 'explicit';
    catalogItemId?: string;
    url?: string;
    urlStatus: 'provided' | 'unresolved';
    urlEvidence?: string[];
    title?: string;
    evidence: string[];
  }>;
  review: {
    status: 'pending' | 'approved';
    requiresHumanConfirmation: boolean;
    workStateMutation: 'separate-reviewed-step';
    approvedBy?: string;
    approvedAt?: string;
    confirmationReason?: string;
  };
  approval?: {
    planId: string;
    confirmedSourceIds: string[];
    reviewedBy: string;
    reviewedAt: string;
    reason: string;
  };
  nextSteps: string[];
}

export interface CatalogQueryResult {
  query: CatalogQuery;
  total: number;
  matched: number;
  rows: CatalogQueryRow[];
}

export interface ProjectMaterializationPlan {
  schemaVersion: 1;
  kind: 'project-materialization-plan';
  planId: string;
  origin: {
    catalogId?: string;
    catalogSource?: string;
    sourceSetPlanId?: string;
    sourceSetProjectId?: string;
    mediaItemId?: string;
    mediaItemIds?: string[];
    snapshotId?: string;
  };
  project: {
    id: string;
    title: string;
    status: 'planned';
    sceneType: string;
    root?: string;
  };
  source?: Record<string, unknown>;
  sources?: Array<Record<string, unknown>>;
  classification?: Record<string, unknown> | null;
  classifications?: Array<Record<string, unknown> | null>;
  selection: {
    reason: string;
    sourceSet: {
      kind: 'single' | 'multi';
      mediaItemIds?: string[];
      sourceIds?: string[];
      reviewPlanId?: string;
    };
    requiresReviewedSourceSet: boolean;
    requiresExplicitAcquisition: true;
    requiresEditorialAuthoring: true;
    inference?: 'disabled';
  };
  nextSteps: string[];
}

export type AcquisitionArtifact = 'video' | 'audio' | 'chat' | 'comments';

export interface AcquisitionPlan {
  schemaVersion: 1;
  kind: 'acquisition-plan';
  planId: string;
  origin: { catalogId: string; catalogSource: string };
  selection: { reason: string; itemCount: number; artifactTypes: AcquisitionArtifact[] };
  requests: Array<{
    item: Record<string, unknown>;
    classification: Record<string, unknown> | null;
    existing: { audio: string; chat: string; comments: string };
    artifacts: Array<{ type: AcquisitionArtifact; status: 'planned' }>;
    eligibility: 'eligible' | 'review-required';
  }>;
  execution: {
    status: 'not-executed';
    explicitApprovalRequired: true;
    downloader: null;
    workStateMutation: 'separate-execution-step';
  };
}

export interface AcquisitionReceipt {
  schemaVersion: 1;
  kind: 'acquisition-receipt';
  planId: string;
  execution: {
    status: 'completed' | 'partial' | 'failed';
    adapter: string;
    executedBy: string;
    executedAt: string;
    finishedAt?: string;
  };
  artifacts: Array<{
    item: string;
    type: AcquisitionArtifact;
    status: 'completed' | 'failed' | 'skipped';
    evidence?: string[];
    note?: string;
  }>;
}
