const artifactTypes = new Set(['video', 'audio', 'chat', 'comments']);

const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

/**
 * Create an intentionally incomplete receipt hand-off from an acquisition
 * plan. The item/artifact coverage is copied exactly; execution and result
 * fields stay blank until an operator has actually run the requested work.
 */
export const buildAcquisitionReceiptTemplate = ({ plan } = {}) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan is required');
  if (plan.kind !== 'acquisition-plan') throw new Error('plan.kind must be acquisition-plan');
  const planId = requiredString(plan.planId, 'plan.planId');
  if (!Array.isArray(plan.requests) || !plan.requests.length) {
    throw new Error('plan.requests must be a non-empty array');
  }
  const seen = new Set();
  const artifacts = [];
  plan.requests.forEach((request, requestIndex) => {
    const item = requiredString(request?.item?.id, `plan.requests[${requestIndex}].item.id`);
    if (!Array.isArray(request.artifacts) || !request.artifacts.length) {
      throw new Error(`${item}.artifacts must be a non-empty array`);
    }
    request.artifacts.forEach((artifact, artifactIndex) => {
      const type = artifact?.type;
      if (!artifactTypes.has(type)) {
        throw new Error(`plan.requests[${requestIndex}].artifacts[${artifactIndex}].type is unsupported`);
      }
      const key = `${item}::${type}`;
      if (seen.has(key)) throw new Error(`duplicate planned artifact: ${key}`);
      seen.add(key);
      artifacts.push({
        item,
        type,
        status: '',
        evidence: [],
        note: '',
      });
    });
  });
  return {
    schemaVersion: 1,
    kind: 'acquisition-receipt',
    planId,
    execution: {
      status: '',
      adapter: '',
      executedBy: '',
      executedAt: '',
    },
    artifacts,
  };
};
