const artifactTypes = new Set(['video', 'audio', 'chat', 'comments']);
const receiptStatuses = new Set(['completed', 'failed', 'skipped']);
const executionStatuses = new Set(['completed', 'partial', 'failed']);
const absoluteLocalPath = /^[A-Za-z]:[\\/]|^\\\\/;
const parentTraversal = /(^|[\\/])\.\.([\\/]|$)/;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requiredString = (value, label, failures) => {
  if (typeof value !== 'string' || !value.trim()) {
    failures.push(`${label} is required`);
    return null;
  }
  return value.trim();
};

const validateIso = (value, label, failures) => {
  const normalized = requiredString(value, label, failures);
  if (!normalized) return null;
  if (!Number.isFinite(Date.parse(normalized))) failures.push(`${label} must be an ISO date`);
  return normalized;
};

const validateEvidence = (evidence, label, failures, { required = false } = {}) => {
  if (evidence === undefined || evidence === null) {
    if (required) failures.push(`${label} must be a non-empty array`);
    return;
  }
  if (!Array.isArray(evidence) || (required && !evidence.length)) {
    failures.push(`${label} must be a non-empty array`);
    return;
  }
  evidence.forEach((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) failures.push(`${label}[${index}] must be a non-empty path`);
    else if (absoluteLocalPath.test(entry) || parentTraversal.test(entry)) failures.push(`${label}[${index}] must be workspace-relative`);
  });
};

const artifactKey = (item, type) => `${item}::${type}`;

export const verifyAcquisitionReceipt = ({ plan, receipt } = {}) => {
  const failures = [];
  if (!isRecord(plan) || plan.kind !== 'acquisition-plan') failures.push('plan.kind must be acquisition-plan');
  if (!isRecord(receipt) || receipt.kind !== 'acquisition-receipt') failures.push('receipt.kind must be acquisition-receipt');
  if (failures.length) return { valid: false, failures };

  const planId = requiredString(plan.planId, 'plan.planId', failures);
  const receiptPlanId = requiredString(receipt.planId, 'receipt.planId', failures);
  if (planId && receiptPlanId && planId !== receiptPlanId) failures.push('receipt.planId must match plan.planId');
  if (receipt.schemaVersion !== 1) failures.push('receipt.schemaVersion must be 1');
  const execution = receipt.execution;
  if (!isRecord(execution)) {
    failures.push('receipt.execution must be an object');
  } else {
    if (!executionStatuses.has(execution.status)) failures.push('receipt.execution.status must be completed, partial, or failed');
    requiredString(execution.adapter, 'receipt.execution.adapter', failures);
    requiredString(execution.executedBy, 'receipt.execution.executedBy', failures);
    validateIso(execution.executedAt, 'receipt.execution.executedAt', failures);
    if (execution.finishedAt !== undefined) validateIso(execution.finishedAt, 'receipt.execution.finishedAt', failures);
  }

  const expected = new Map();
  if (!Array.isArray(plan.requests) || !plan.requests.length) {
    failures.push('plan.requests must be a non-empty array');
  } else {
    plan.requests.forEach((request, requestIndex) => {
      const item = request?.item?.id;
      if (typeof item !== 'string' || !item.trim()) {
        failures.push(`plan.requests[${requestIndex}].item.id is required`);
        return;
      }
      if (!Array.isArray(request.artifacts) || !request.artifacts.length) {
        failures.push(`${item}.artifacts must be a non-empty array`);
        return;
      }
      request.artifacts.forEach((artifact, artifactIndex) => {
        const type = artifact?.type;
        if (!artifactTypes.has(type)) {
          failures.push(`${item}.artifacts[${artifactIndex}].type is unsupported`);
          return;
        }
        const key = artifactKey(item, type);
        if (expected.has(key)) failures.push(`duplicate planned artifact: ${key}`);
        expected.set(key, { item, type });
      });
    });
  }

  if (!Array.isArray(receipt.artifacts) || !receipt.artifacts.length) {
    failures.push('receipt.artifacts must be a non-empty array');
  } else {
    const seen = new Set();
    let completedCount = 0;
    let incompleteCount = 0;
    receipt.artifacts.forEach((artifact, index) => {
      const label = `receipt.artifacts[${index}]`;
      const item = requiredString(artifact?.item, `${label}.item`, failures);
      const type = requiredString(artifact?.type, `${label}.type`, failures);
      const status = artifact?.status;
      if (!receiptStatuses.has(status)) failures.push(`${label}.status must be completed, failed, or skipped`);
      if (!item || !type) return;
      const key = artifactKey(item, type);
      if (!expected.has(key)) failures.push(`${label} is not present in the acquisition plan: ${key}`);
      if (seen.has(key)) failures.push(`duplicate receipt artifact: ${key}`);
      seen.add(key);
      if (status === 'completed') {
        completedCount += 1;
        validateEvidence(artifact.evidence, `${label}.evidence`, failures, { required: true });
      } else {
        incompleteCount += 1;
        validateEvidence(artifact.evidence, `${label}.evidence`, failures);
        requiredString(artifact.note, `${label}.note`, failures);
      }
    });
    expected.forEach((_value, key) => {
      if (!seen.has(key)) failures.push(`receipt is missing planned artifact: ${key}`);
    });
    if (execution?.status === 'completed' && incompleteCount > 0) failures.push('completed execution cannot contain failed or skipped artifacts');
    if (execution?.status === 'completed' && completedCount !== expected.size) failures.push('completed execution must cover every planned artifact');
    if (execution?.status === 'failed' && completedCount > 0) failures.push('failed execution cannot contain completed artifacts');
    if (execution?.status === 'partial' && (completedCount === 0 || incompleteCount === 0)) failures.push('partial execution must contain both completed and incomplete artifacts');
  }

  return {
    valid: failures.length === 0,
    failures,
    summary: {
      planId,
      plannedArtifacts: expected.size,
      receiptArtifacts: Array.isArray(receipt.artifacts) ? receipt.artifacts.length : 0,
      executionStatus: execution?.status || null,
    },
  };
};
