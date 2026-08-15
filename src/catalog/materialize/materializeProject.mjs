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
  items,
  classification,
  classifications,
  projectId,
  projectTitle,
  projectRoot,
  selectionReason,
  snapshotId,
} = {}) => {
  const selectedItems = Array.isArray(items) && items.length ? items : item ? [item] : [];
  if (!selectedItems.length) throw new Error('at least one Media Item is required');
  selectedItems.forEach(assertMediaItem);
  const itemIds = selectedItems.map((selectedItem) => selectedItem.id);
  if (new Set(itemIds).size !== itemIds.length) throw new Error('selected Media Items must be unique');
  const catalogId = requiredString(catalog?.id, 'catalog.id');
  const catalogProvider = requiredString(catalog?.provider, 'catalog.provider');
  const catalogSource = requiredString(catalog?.source, 'catalog.source');
  const selectedProjectId = requiredString(projectId, 'projectId');
  if (!projectIdPattern.test(selectedProjectId)) throw new Error(`projectId is not a stable slug: ${selectedProjectId}`);
  selectedItems.forEach((selectedItem) => {
    if (selectedItem.provider !== catalogProvider) {
      throw new Error(`item provider does not match catalog provider: ${selectedItem.provider}`);
    }
  });
  const selectedClassifications = selectedItems.length === 1 && classification
    ? [classification]
    : Array.isArray(classifications) ? classifications : [];
  if (selectedClassifications.length !== selectedItems.length) {
    throw new Error('classifications must include exactly one entry per selected item');
  }
  const classificationIds = new Set();
  selectedClassifications.forEach((entry) => {
    if (!entry || !itemIds.includes(entry.item)) throw new Error(`classification references an unselected item: ${entry?.item || 'unknown'}`);
    if (classificationIds.has(entry.item)) throw new Error(`duplicate classification for selected item: ${entry.item}`);
    classificationIds.add(entry.item);
  });
  const selectedIdSet = new Set(itemIds);
  if (classificationIds.size !== selectedIdSet.size) throw new Error('classifications do not cover every selected item');
  const singleSource = selectedItems.length === 1;
  const sourceRecords = selectedItems.map((selectedItem) => ({
    provider: selectedItem.provider,
    externalId: selectedItem.externalId,
    url: selectedItem.url,
    title: selectedItem.title,
    ...(selectedItem.publishedAt ? { publishedAt: selectedItem.publishedAt } : {}),
    ...(selectedItem.releaseTimestamp !== undefined ? { releaseTimestamp: selectedItem.releaseTimestamp } : {}),
    ...(selectedItem.durationMs !== undefined ? { durationMs: selectedItem.durationMs } : {}),
    mediaType: selectedItem.mediaType,
    liveStatus: selectedItem.liveStatus,
    availability: selectedItem.availability,
  }));
  const selectedTitle = projectTitle || (singleSource ? selectedItems[0].title : `${selectedItems.length} selected catalog sources`);
  const plan = {
    schemaVersion: 1,
    kind: 'project-materialization-plan',
    planId: `${catalogId}:${itemIds.join(',')}:${selectedProjectId}`,
    origin: {
      catalogId,
      catalogSource,
      ...(singleSource ? { mediaItemId: itemIds[0] } : { mediaItemIds: itemIds }),
      ...(snapshotId ? { snapshotId } : {}),
    },
    project: {
      id: selectedProjectId,
      title: selectedTitle,
      status: 'planned',
      sceneType: 'catalog_materialization_pending',
      ...(projectRoot ? { root: projectRoot } : {}),
    },
    ...(singleSource
      ? {
          source: sourceRecords[0],
          classification: publicClassification(selectedClassifications[0]),
        }
      : {
          sources: sourceRecords,
          classifications: selectedClassifications.map(publicClassification),
        }),
    selection: {
      reason: requiredString(selectionReason, 'selectionReason'),
      sourceSet: {
        kind: singleSource ? 'single' : 'multi',
        mediaItemIds: itemIds,
      },
      requiresReviewedSourceSet: true,
      requiresExplicitAcquisition: true,
      requiresEditorialAuthoring: true,
    },
    nextSteps: [
      'create or attach a local Project workspace',
      'freeze exactly the listed source set and verify every source media availability',
      'record audio/chat/comments/transcript work state locally',
      'author and review canonical evidence before any public projection',
    ],
  };
  return plan;
};
