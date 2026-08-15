import { assertMediaItem } from '../model/catalogPackage.mjs';

const projectIdPattern = /^[a-z0-9][a-z0-9-]*$/;
const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const publicClassification = (classification) => classification ? {
  primaryCategory: classification.primaryCategory ?? null,
  series: classification.series ?? null,
  game: classification.game ?? null,
  format: Array.isArray(classification.format) ? classification.format : [],
  people: Array.isArray(classification.people) ? classification.people : [],
  topics: Array.isArray(classification.topics) ? classification.topics : [],
  tags: Array.isArray(classification.tags) ? classification.tags : [],
  reviewed: Boolean(classification.classification?.reviewed),
  source: classification.classification?.source || 'unclassified',
} : null;

export const buildProjectMaterializationPlan = ({
  catalog,
  item,
  classification,
  projectId,
  projectTitle,
  projectRoot,
  selectionReason,
  snapshotId,
} = {}) => {
  assertMediaItem(item);
  const catalogId = requiredString(catalog?.id, 'catalog.id');
  const catalogProvider = requiredString(catalog?.provider, 'catalog.provider');
  const catalogSource = requiredString(catalog?.source, 'catalog.source');
  const selectedProjectId = requiredString(projectId, 'projectId');
  if (!projectIdPattern.test(selectedProjectId)) throw new Error(`projectId is not a stable slug: ${selectedProjectId}`);
  if (item.provider !== catalogProvider) throw new Error(`item provider does not match catalog provider: ${item.provider}`);
  if (!classification || classification.item !== item.id) {
    throw new Error(`classification must reference selected item: ${item.id}`);
  }
  const plan = {
    schemaVersion: 1,
    kind: 'project-materialization-plan',
    planId: `${catalogId}:${item.id}:${selectedProjectId}`,
    origin: {
      catalogId,
      catalogSource,
      mediaItemId: item.id,
      ...(snapshotId ? { snapshotId } : {}),
    },
    project: {
      id: selectedProjectId,
      title: projectTitle || item.title,
      status: 'planned',
      sceneType: 'catalog_materialization_pending',
      ...(projectRoot ? { root: projectRoot } : {}),
    },
    source: {
      provider: item.provider,
      externalId: item.externalId,
      url: item.url,
      title: item.title,
      ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
      ...(item.releaseTimestamp !== undefined ? { releaseTimestamp: item.releaseTimestamp } : {}),
      ...(item.durationMs !== undefined ? { durationMs: item.durationMs } : {}),
      mediaType: item.mediaType,
      liveStatus: item.liveStatus,
      availability: item.availability,
    },
    classification: publicClassification(classification),
    selection: {
      reason: requiredString(selectionReason, 'selectionReason'),
      requiresReviewedSourceSet: true,
      requiresExplicitAcquisition: true,
      requiresEditorialAuthoring: true,
    },
    nextSteps: [
      'create or attach a local Project workspace',
      'freeze the selected source set and verify source media availability',
      'record audio/chat/comments/transcript work state locally',
      'author and review canonical evidence before any public projection',
    ],
  };
  return plan;
};
