import { assertMediaItem } from '../model/catalogPackage.mjs';

const artifactTypes = new Set(['video', 'audio', 'chat', 'comments']);
const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const classificationSummary = (classification) => classification ? {
  primaryCategory: classification.primaryCategory ?? null,
  series: classification.series ?? null,
  game: classification.game ?? null,
  reviewed: Boolean(classification.classification?.reviewed),
  source: classification.classification?.source || 'unclassified',
} : null;

const existingStatus = (state, section) => state?.[section]?.status || 'unknown';

export const buildAcquisitionPlan = ({
  catalog,
  items,
  classifications = [],
  workState = [],
  itemIds,
  artifacts = ['audio'],
  planId,
  selectionReason,
} = {}) => {
  const catalogId = requiredString(catalog?.id, 'catalog.id');
  const catalogProvider = requiredString(catalog?.provider, 'catalog.provider');
  const catalogSource = requiredString(catalog?.source, 'catalog.source');
  const selectedIds = [...new Set((itemIds || []).map((id) => requiredString(id, 'itemId')))].sort();
  if (!selectedIds.length) throw new Error('at least one itemId is required');
  const selectedArtifacts = [...new Set(artifacts.map((artifact) => requiredString(artifact, 'artifact')))].sort();
  if (!selectedArtifacts.length || selectedArtifacts.some((artifact) => !artifactTypes.has(artifact))) {
    throw new Error(`unsupported acquisition artifact; allowed: ${[...artifactTypes].join(', ')}`);
  }
  const selectedPlanId = requiredString(planId, 'planId');
  const reason = requiredString(selectionReason, 'selectionReason');
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const classificationsByItem = new Map(classifications.map((classification) => [classification.item, classification]));
  const workStateByItem = new Map(workState.map((state) => [state.item, state]));
  const requests = selectedIds.map((itemId) => {
    const item = itemsById.get(itemId);
    if (!item) throw new Error(`selected Media Item was not found: ${itemId}`);
    assertMediaItem(item);
    if (item.provider !== catalogProvider) throw new Error(`item provider does not match catalog provider: ${item.provider}`);
    const state = workStateByItem.get(itemId);
    return {
      item: {
        id: item.id,
        externalId: item.externalId,
        provider: item.provider,
        url: item.url,
        title: item.title,
        availability: item.availability,
      },
      classification: classificationSummary(classificationsByItem.get(itemId)),
      existing: {
        audio: existingStatus(state, 'audio'),
        chat: existingStatus(state, 'chat'),
        comments: existingStatus(state, 'comments'),
      },
      artifacts: selectedArtifacts.map((artifact) => ({
        type: artifact,
        status: 'planned',
      })),
      eligibility: item.availability?.status === 'available' ? 'eligible' : 'review-required',
    };
  });
  return {
    schemaVersion: 1,
    kind: 'acquisition-plan',
    planId: selectedPlanId,
    origin: { catalogId, catalogSource },
    selection: {
      reason,
      itemCount: requests.length,
      artifactTypes: selectedArtifacts,
    },
    requests,
    execution: {
      status: 'not-executed',
      explicitApprovalRequired: true,
      downloader: null,
      workStateMutation: 'separate-execution-step',
    },
  };
};
