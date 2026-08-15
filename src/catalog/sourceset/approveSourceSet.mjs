const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const normalizeReviewedAt = (value) => {
  const reviewedAt = requiredString(value, 'approval.reviewedAt');
  const timestamp = Date.parse(reviewedAt);
  if (!Number.isFinite(timestamp)) throw new Error('approval.reviewedAt must be an ISO date');
  return new Date(timestamp).toISOString();
};

const normalizeSourceIds = (value) => {
  if (!Array.isArray(value) || !value.length) throw new Error('approval.confirmedSourceIds must be a non-empty array');
  const ids = value.map((entry, index) => requiredString(entry, `approval.confirmedSourceIds[${index}]`));
  if (new Set(ids).size !== ids.length) throw new Error('approval.confirmedSourceIds must be unique');
  return ids;
};

export const approveSourceSetReviewPlan = ({ plan, approval } = {}) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan is required');
  if (plan.kind !== 'source-set-review-plan') throw new Error('plan.kind must be source-set-review-plan');
  if (plan.review?.status !== 'pending' || plan.review?.requiresHumanConfirmation !== true) {
    throw new Error('only a pending source-set review plan can be approved');
  }
  if (!Array.isArray(plan.sources) || !plan.sources.length) throw new Error('plan.sources must be a non-empty array');
  const sourceIds = plan.sources.map((source) => requiredString(source?.id, 'plan.sources[].id'));
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error('plan.sources must have unique ids');
  if (plan.sources.some((source) => source.urlStatus !== 'provided' || !source.url)) {
    throw new Error('all source URLs must be provided before approval');
  }
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) throw new Error('approval is required');
  if (requiredString(approval.planId, 'approval.planId') !== plan.planId) {
    throw new Error('approval.planId must match plan.planId');
  }
  const confirmedSourceIds = normalizeSourceIds(approval.confirmedSourceIds);
  if (confirmedSourceIds.length !== sourceIds.length
    || confirmedSourceIds.some((id, index) => id !== sourceIds[index])) {
    throw new Error('approval.confirmedSourceIds must exactly match plan.sources in order');
  }
  const reviewedBy = requiredString(approval.reviewedBy, 'approval.reviewedBy');
  const reviewedAt = normalizeReviewedAt(approval.reviewedAt);
  const confirmationReason = requiredString(approval.reason, 'approval.reason');
  return {
    ...plan,
    review: {
      ...plan.review,
      status: 'approved',
      requiresHumanConfirmation: false,
      approvedBy: reviewedBy,
      approvedAt: reviewedAt,
      confirmationReason,
    },
    approval: {
      planId: plan.planId,
      confirmedSourceIds,
      reviewedBy,
      reviewedAt,
      reason: confirmationReason,
    },
    nextSteps: [
      'materialize exactly the approved source set into a Project plan',
      'create or attach a local Project workspace only after explicit acquisition',
    ],
  };
};
