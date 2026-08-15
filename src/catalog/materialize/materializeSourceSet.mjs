const projectIdPattern = /^[a-z0-9][a-z0-9-]*$/;
const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const sourceRecord = (source, index) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error(`source-set.sources[${index}] must be an object`);
  const id = requiredString(source.id, `source-set.sources[${index}].id`);
  const provider = requiredString(source.provider, `source-set.sources[${index}].provider`);
  const externalId = requiredString(source.externalId, `source-set.sources[${index}].externalId`);
  const url = requiredString(source.url, `source-set.sources[${index}].url`);
  if (source.urlStatus !== 'provided') throw new Error(`${id} must have a provided URL`);
  if (!Array.isArray(source.evidence) || !source.evidence.length) throw new Error(`${id} must retain local evidence`);
  return {
    id,
    provider,
    externalId,
    ...(source.origin ? { origin: source.origin } : {}),
    ...(source.catalogItemId ? { catalogItemId: source.catalogItemId } : {}),
    url,
    ...(source.title ? { title: source.title } : {}),
    ...(source.urlEvidence ? { urlEvidence: source.urlEvidence } : {}),
    evidence: [...source.evidence],
  };
};

export const buildSourceSetMaterializationPlan = ({
  sourceSet,
  projectId,
  projectTitle,
  projectRoot,
  selectionReason,
  snapshotId,
} = {}) => {
  if (!sourceSet || typeof sourceSet !== 'object' || Array.isArray(sourceSet)) throw new Error('sourceSet is required');
  if (sourceSet.kind !== 'source-set-review-plan' || sourceSet.review?.status !== 'approved') {
    throw new Error('an approved source-set review plan is required');
  }
  const selectedProjectId = requiredString(projectId || sourceSet.project?.id, 'projectId');
  if (!projectIdPattern.test(selectedProjectId)) throw new Error(`projectId is not a stable slug: ${selectedProjectId}`);
  const sources = sourceSet.sources.map(sourceRecord);
  if (!sources.length) throw new Error('sourceSet.sources must be non-empty');
  const sourceIds = sources.map((source) => source.id);
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error('source-set sources must be unique');
  const singleSource = sources.length === 1;
  const selectedTitle = projectTitle || sourceSet.project?.title || (singleSource ? sources[0].title : `${sources.length} approved sources`);
  return {
    schemaVersion: 1,
    kind: 'project-materialization-plan',
    planId: `source-set:${sourceSet.planId}:${selectedProjectId}`,
    origin: {
      sourceSetPlanId: sourceSet.planId,
      sourceSetProjectId: sourceSet.project?.id,
      ...(snapshotId ? { snapshotId } : {}),
    },
    project: {
      id: selectedProjectId,
      title: selectedTitle,
      status: 'planned',
      sceneType: 'approved_source_set_materialization_pending',
      ...(projectRoot ? { root: projectRoot } : {}),
    },
    ...(singleSource ? { source: sources[0] } : { sources }),
    selection: {
      reason: requiredString(selectionReason, 'selectionReason'),
      sourceSet: {
        kind: singleSource ? 'single' : 'multi',
        sourceIds,
        reviewPlanId: sourceSet.planId,
      },
      requiresReviewedSourceSet: false,
      requiresExplicitAcquisition: true,
      requiresEditorialAuthoring: true,
      inference: 'disabled',
    },
    nextSteps: [
      'create or attach a local Project workspace',
      'freeze exactly the approved source set and verify every source media availability',
      'record audio/chat/comments/transcript work state locally',
      'author and review canonical evidence before any public projection',
    ],
  };
};
