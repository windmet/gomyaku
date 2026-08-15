import { verifyAcquisitionReceipt } from '../acquire/acquisitionReceipt.mjs';

const artifactSection = {
  video: 'video',
  audio: 'audio',
  chat: 'chat',
  comments: 'comments',
};

const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
};

export const buildWorkStateUpdatePlan = ({ acquisitionPlan, receipt } = {}) => {
  const receiptResult = verifyAcquisitionReceipt({ plan: acquisitionPlan, receipt });
  if (!receiptResult.valid) throw new Error(`acquisition receipt is invalid: ${receiptResult.failures.join('; ')}`);
  if (receipt.execution.status !== 'completed') throw new Error('Work State update plan requires a completed acquisition receipt');
  if (receipt.artifacts.some((artifact) => artifact.status !== 'completed')) {
    throw new Error('Work State update plan requires every artifact to be completed');
  }

  const byItem = new Map();
  receipt.artifacts.forEach((artifact) => {
    const item = requiredString(artifact.item, 'receipt.artifact.item');
    const section = artifactSection[artifact.type];
    if (!section) throw new Error(`unsupported receipt artifact type: ${artifact.type}`);
    if (!byItem.has(item)) byItem.set(item, { sections: {}, evidence: new Set(), artifactTypes: [] });
    const entry = byItem.get(item);
    entry.sections[section] = {
      status: 'downloaded',
      source: 'verified-acquisition-receipt',
      receiptPlanId: receipt.planId,
    };
    entry.artifactTypes.push(artifact.type);
    artifact.evidence.forEach((evidence) => entry.evidence.add(evidence));
  });

  const updates = [...byItem.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([item, entry]) => ({
    schemaVersion: 1,
    item,
    ...entry.sections,
    sourceEngineering: {
      status: 'receipt-verified',
      receiptPlanId: receipt.planId,
      artifactTypes: [...new Set(entry.artifactTypes)].sort(),
    },
    evidence: [...entry.evidence].sort(),
  }));
  return {
    schemaVersion: 1,
    kind: 'work-state-update-plan',
    planId: `work-state:${receipt.planId}`,
    origin: {
      acquisitionPlanId: acquisitionPlan.planId,
      acquisitionReceiptPlanId: receipt.planId,
    },
    review: {
      status: 'pending',
      requiresHumanConfirmation: true,
      workStateMutation: 'separate-apply-step',
    },
    updates,
    nextSteps: [
      'review every proposed item and artifact status against the local Project manifest',
      'apply the approved rows through a separate local Work State operation',
      're-run catalog validate-work-state with an evidence root after any apply',
    ],
  };
};
