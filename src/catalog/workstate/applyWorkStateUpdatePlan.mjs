import { validateWorkState, validateWorkStateRows } from './workState.mjs';

const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

const normalizeReviewedAt = (value) => {
  const reviewedAt = requiredString(value, 'approval.reviewedAt');
  if (!Number.isFinite(Date.parse(reviewedAt))) throw new Error('approval.reviewedAt must be an ISO date');
  return new Date(reviewedAt).toISOString();
};

const sectionNames = new Set([
  'metadata',
  'audio',
  'video',
  'chat',
  'comments',
  'transcript',
  'project',
  'publication',
  'sourceEngineering',
]);

export const applyWorkStateUpdatePlan = ({ currentRows = [], plan, approval, knownItemIds } = {}) => {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan is required');
  if (plan.kind !== 'work-state-update-plan') throw new Error('plan.kind must be work-state-update-plan');
  if (plan.review?.status !== 'pending' || plan.review?.requiresHumanConfirmation !== true) {
    throw new Error('only a pending Work State update plan can be applied');
  }
  if (!Array.isArray(plan.updates) || !plan.updates.length) throw new Error('plan.updates must be a non-empty array');
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) throw new Error('approval is required');
  if (requiredString(approval.planId, 'approval.planId') !== plan.planId) throw new Error('approval.planId must match plan.planId');
  if (!Array.isArray(approval.confirmedItems) || !approval.confirmedItems.length) throw new Error('approval.confirmedItems must be a non-empty array');
  const updateItems = plan.updates.map((update) => requiredString(update?.item, 'plan.updates[].item'));
  const confirmedItems = approval.confirmedItems.map((item, index) => requiredString(item, `approval.confirmedItems[${index}]`));
  if (new Set(updateItems).size !== updateItems.length) throw new Error('plan.updates must have unique items');
  if (new Set(confirmedItems).size !== confirmedItems.length
    || confirmedItems.length !== updateItems.length
    || confirmedItems.some((item, index) => item !== updateItems[index])) {
    throw new Error('approval.confirmedItems must exactly match plan.updates in order');
  }
  const reviewedBy = requiredString(approval.reviewedBy, 'approval.reviewedBy');
  const reviewedAt = normalizeReviewedAt(approval.reviewedAt);
  const reason = requiredString(approval.reason, 'approval.reason');

  const currentValidation = validateWorkStateRows(currentRows, { knownItemIds });
  if (!currentValidation.valid) throw new Error(`current Work State is invalid: ${currentValidation.failures.join('; ')}`);
  const known = knownItemIds ? new Set(knownItemIds) : null;
  const updateRows = plan.updates.map((update) => {
    if (known && !known.has(update.item)) throw new Error(`unknown item in Work State update plan: ${update.item}`);
    const result = validateWorkState(update, { knownItemIds });
    if (!result.valid) throw new Error(`invalid Work State update for ${update.item}: ${result.failures.join('; ')}`);
    return update;
  });

  const rowMap = new Map(currentRows.map((row) => [row.item, row]));
  const changedSections = [];
  updateRows.forEach((update) => {
    const existing = rowMap.get(update.item) || { schemaVersion: 1, item: update.item, evidence: [] };
    const merged = { ...existing };
    for (const [key, value] of Object.entries(update)) {
      if (sectionNames.has(key)) {
        merged[key] = value;
        changedSections.push(`${update.item}:${key}`);
      }
    }
    merged.evidence = [...new Set([...(existing.evidence || []), ...update.evidence])].sort();
    rowMap.set(update.item, merged);
  });
  const rows = [...rowMap.values()];
  const finalValidation = validateWorkStateRows(rows, { knownItemIds });
  if (!finalValidation.valid) throw new Error(`applied Work State would be invalid: ${finalValidation.failures.join('; ')}`);
  return {
    kind: 'work-state-apply-result',
    planId: plan.planId,
    approval: {
      planId: plan.planId,
      confirmedItems,
      reviewedBy,
      reviewedAt,
      reason,
    },
    appliedItems: updateItems,
    changedSections: [...new Set(changedSections)],
    rows,
  };
};
