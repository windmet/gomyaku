const sourceIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const originValues = new Set(['catalog', 'explicit']);
const absoluteLocalPath = /^[A-Za-z]:[\\/]|^\\\\/;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const normalizeEvidence = (evidence, label) => {
  if (!Array.isArray(evidence) || !evidence.length) throw new Error(`${label}.evidence must be a non-empty array`);
  return evidence.map((entry, index) => {
    const value = requiredString(entry, `${label}.evidence[${index}]`);
    if (absoluteLocalPath.test(value)) throw new Error(`${label}.evidence[${index}] must be workspace-relative`);
    return value;
  });
};

const normalizeSource = (source, index) => {
  const label = `sources[${index}]`;
  if (!isRecord(source)) throw new Error(`${label} must be an object`);
  const id = requiredString(source.id, `${label}.id`);
  if (!sourceIdPattern.test(id)) throw new Error(`${label}.id is not a stable source id: ${id}`);
  const provider = requiredString(source.provider, `${label}.provider`);
  const externalId = requiredString(source.externalId, `${label}.externalId`);
  const origin = source.origin || 'explicit';
  if (!originValues.has(origin)) throw new Error(`${label}.origin must be catalog or explicit`);
  if (origin === 'catalog' && typeof source.catalogItemId !== 'string') {
    throw new Error(`${label}.catalogItemId is required for catalog origin`);
  }
  if (source.url !== undefined && source.url !== null && typeof source.url !== 'string') {
    throw new Error(`${label}.url must be a string when provided`);
  }
  return {
    id,
    provider,
    externalId,
    origin,
    ...(source.catalogItemId ? { catalogItemId: source.catalogItemId } : {}),
    ...(source.url ? { url: source.url } : {}),
    urlStatus: source.url ? 'provided' : 'unresolved',
    ...(source.title ? { title: requiredString(source.title, `${label}.title`) } : {}),
    evidence: normalizeEvidence(source.evidence, label),
  };
};

export const buildSourceSetReviewPlan = ({ projectId, sources, selectionReason } = {}) => {
  const selectedProjectId = requiredString(projectId, 'projectId');
  if (!Array.isArray(sources) || !sources.length) throw new Error('at least one source is required');
  const normalizedSources = sources.map(normalizeSource);
  const sourceIds = new Set();
  normalizedSources.forEach((source) => {
    if (sourceIds.has(source.id)) throw new Error(`duplicate source id: ${source.id}`);
    sourceIds.add(source.id);
  });
  return {
    schemaVersion: 1,
    kind: 'source-set-review-plan',
    planId: `source-set:${selectedProjectId}:${normalizedSources.map((source) => source.id).join(',')}`,
    project: { id: selectedProjectId },
    selection: {
      reason: requiredString(selectionReason, 'selectionReason'),
      sourceCount: normalizedSources.length,
      sourceSetKind: normalizedSources.length === 1 ? 'single' : 'multi',
      inference: 'disabled',
    },
    sources: normalizedSources,
    review: {
      status: 'pending',
      requiresHumanConfirmation: true,
      workStateMutation: 'separate-reviewed-step',
    },
    nextSteps: [
      'confirm that every listed source belongs to the Project',
      'resolve missing URLs or provider metadata without inferring from filenames',
      'approve the source set before materialization or acquisition',
    ],
  };
};
