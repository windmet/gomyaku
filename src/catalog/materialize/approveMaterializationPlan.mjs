const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const normalizeReviewedAt = (value) => {
  const reviewedAt = requiredString(value, 'approval.reviewedAt');
  if (!Number.isFinite(Date.parse(reviewedAt))) throw new Error('approval.reviewedAt must be an ISO date');
  return new Date(reviewedAt).toISOString();
};

const sourceIdsFromPlan = (plan) => {
  const ids = plan.origin?.mediaItemIds || (plan.origin?.mediaItemId ? [plan.origin.mediaItemId] : []);
  if (!Array.isArray(ids) || !ids.length) throw new Error('materialization plan must contain Catalog media item ids');
  return ids;
};

export const approveMaterializationPlan = ({ plan, approval } = {}) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan is required');
  if (plan.kind !== 'project-materialization-plan') throw new Error('plan.kind must be project-materialization-plan');
  if (plan.selection?.requiresReviewedSourceSet !== true) {
    throw new Error('only a materialization plan awaiting source-set review can be approved');
  }
  const sourceIds = sourceIdsFromPlan(plan);
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error('materialization plan source ids must be unique');
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) throw new Error('approval is required');
  if (requiredString(approval.planId, 'approval.planId') !== plan.planId) throw new Error('approval.planId must match plan.planId');
  if (requiredString(approval.projectId, 'approval.projectId') !== plan.project.id) throw new Error('approval.projectId must match plan.project.id');
  if (!Array.isArray(approval.confirmedMediaItemIds) || !approval.confirmedMediaItemIds.length) {
    throw new Error('approval.confirmedMediaItemIds must be a non-empty array');
  }
  if (new Set(approval.confirmedMediaItemIds).size !== approval.confirmedMediaItemIds.length
    || approval.confirmedMediaItemIds.length !== sourceIds.length
    || approval.confirmedMediaItemIds.some((id, index) => id !== sourceIds[index])) {
    throw new Error('approval.confirmedMediaItemIds must exactly match plan source ids in order');
  }
  const reviewedBy = requiredString(approval.reviewedBy, 'approval.reviewedBy');
  const reviewedAt = normalizeReviewedAt(approval.reviewedAt);
  const reason = requiredString(approval.reason, 'approval.reason');
  return {
    ...plan,
    selection: {
      ...plan.selection,
      requiresReviewedSourceSet: false,
    },
    review: {
      status: 'approved',
      requiresHumanConfirmation: false,
      approvedBy: reviewedBy,
      approvedAt: reviewedAt,
      confirmationReason: reason,
    },
    approval: {
      planId: plan.planId,
      projectId: plan.project.id,
      confirmedMediaItemIds: [...approval.confirmedMediaItemIds],
      reviewedBy,
      reviewedAt,
      reason,
    },
    nextSteps: [
      'create or attach the local Project workspace after explicit acquisition approval',
      'record acquisition receipt and Work State evidence before editorial authoring',
    ],
  };
};
