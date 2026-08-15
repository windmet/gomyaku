const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const requirePlan = (plan, kind) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan is required');
  if (plan.kind !== kind) throw new Error(`plan.kind must be ${kind}`);
  return plan;
};

const materializationIds = (plan) => {
  const ids = plan.origin?.mediaItemIds
    || (plan.origin?.mediaItemId ? [plan.origin.mediaItemId] : []);
  if (!Array.isArray(ids) || !ids.length) {
    throw new Error('materialization plan must contain Catalog media item ids');
  }
  if (new Set(ids).size !== ids.length) throw new Error('materialization plan source ids must be unique');
  return [...ids];
};

/**
 * Create a deliberately incomplete approval document from a pending plan.
 * The blank reviewer fields are intentional: this is a hand-off artifact,
 * not an approval and it cannot be passed to approveMaterializationPlan.
 */
export const buildMaterializationApprovalTemplate = ({ plan } = {}) => {
  const selectedPlan = requirePlan(plan, 'project-materialization-plan');
  if (selectedPlan.selection?.requiresReviewedSourceSet !== true
    || selectedPlan.review?.status === 'approved') {
    throw new Error('only a pending materialization plan can produce an approval template');
  }
  return {
    planId: requiredString(selectedPlan.planId, 'plan.planId'),
    projectId: requiredString(selectedPlan.project?.id, 'plan.project.id'),
    confirmedMediaItemIds: materializationIds(selectedPlan),
    reviewedBy: '',
    reviewedAt: '',
    reason: '',
  };
};

/**
 * Create a deliberately incomplete approval document from a pending
 * provider-neutral Source Set Review plan.
 */
export const buildSourceSetApprovalTemplate = ({ plan } = {}) => {
  const selectedPlan = requirePlan(plan, 'source-set-review-plan');
  if (selectedPlan.review?.status !== 'pending'
    || selectedPlan.review?.requiresHumanConfirmation !== true) {
    throw new Error('only a pending source-set review plan can produce an approval template');
  }
  if (!Array.isArray(selectedPlan.sources) || !selectedPlan.sources.length) {
    throw new Error('plan.sources must be a non-empty array');
  }
  const confirmedSourceIds = selectedPlan.sources.map((source, index) => (
    requiredString(source?.id, `plan.sources[${index}].id`)
  ));
  if (new Set(confirmedSourceIds).size !== confirmedSourceIds.length) {
    throw new Error('plan.sources must have unique ids');
  }
  return {
    planId: requiredString(selectedPlan.planId, 'plan.planId'),
    confirmedSourceIds,
    reviewedBy: '',
    reviewedAt: '',
    reason: '',
  };
};
