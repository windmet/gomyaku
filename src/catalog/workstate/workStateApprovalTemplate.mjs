const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

/**
 * Create an intentionally incomplete approval hand-off from a pending Work
 * State update plan. Item order is copied from the proposal; no state is
 * written and no reviewer metadata is inferred.
 */
export const buildWorkStateApprovalTemplate = ({ plan } = {}) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan is required');
  if (plan.kind !== 'work-state-update-plan') throw new Error('plan.kind must be work-state-update-plan');
  if (plan.review?.status !== 'pending' || plan.review?.requiresHumanConfirmation !== true) {
    throw new Error('only a pending Work State update plan can produce an approval template');
  }
  if (!Array.isArray(plan.updates) || !plan.updates.length) {
    throw new Error('plan.updates must be a non-empty array');
  }
  const confirmedItems = plan.updates.map((update, index) => (
    requiredString(update?.item, `plan.updates[${index}].item`)
  ));
  if (new Set(confirmedItems).size !== confirmedItems.length) {
    throw new Error('plan.updates must have unique items');
  }
  return {
    planId: requiredString(plan.planId, 'plan.planId'),
    confirmedItems,
    reviewedBy: '',
    reviewedAt: '',
    reason: '',
  };
};
