const sectionNames = [
  'metadata',
  'audio',
  'video',
  'chat',
  'comments',
  'transcript',
  'project',
  'publication',
  'sourceEngineering',
];

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const requiredString = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) return `${label} is required`;
  return null;
};

const absoluteLocalPath = /^[A-Za-z]:[\\/]|^\\\\/;
const parentTraversal = /(^|[\\/])\.\.([\\/]|$)/;

const validateEvidence = (evidence, failures) => {
  if (!Array.isArray(evidence) || evidence.length === 0) {
    failures.push('evidence must be a non-empty array');
    return;
  }
  evidence.forEach((entry, index) => {
    if (typeof entry !== 'string' || !entry.trim()) failures.push(`evidence[${index}] must be a non-empty path`);
    else if (absoluteLocalPath.test(entry) || parentTraversal.test(entry)) failures.push(`evidence[${index}] must be workspace-relative`);
  });
};

const validateSection = (section, label, failures) => {
  if (section === undefined) return;
  if (!isRecord(section)) {
    failures.push(`${label} must be an object`);
    return;
  }
  const statusFailure = requiredString(section.status, `${label}.status`);
  if (statusFailure) failures.push(statusFailure);
  if (section.candidate !== undefined && typeof section.candidate !== 'boolean') {
    failures.push(`${label}.candidate must be a boolean`);
  }
};

export const validateWorkState = (state, { knownItemIds } = {}) => {
  const failures = [];
  if (!isRecord(state)) {
    failures.push('Work State must be an object');
    return { valid: false, failures };
  }
  if (state.schemaVersion !== 1) failures.push('schemaVersion must be 1');
  const itemFailure = requiredString(state.item, 'item');
  if (itemFailure) failures.push(itemFailure);
  if (knownItemIds && state.item && !knownItemIds.has(state.item)) failures.push(`unknown item: ${state.item}`);
  validateEvidence(state.evidence, failures);
  sectionNames.forEach((sectionName) => validateSection(state[sectionName], sectionName, failures));
  return { valid: failures.length === 0, failures };
};

export const assertWorkState = (state, options) => {
  const result = validateWorkState(state, options);
  if (!result.valid) throw new Error(result.failures.join('; '));
  return state;
};

export const validateWorkStateRows = (workState = [], { knownItemIds } = {}) => {
  const failures = [];
  const stateIds = new Set();
  workState.forEach((state) => {
    const result = validateWorkState(state, { knownItemIds });
    result.failures.forEach((failure) => failures.push(`${state?.item || 'unknown Work State'}: ${failure}`));
    if (state?.item && stateIds.has(state.item)) failures.push(`duplicate Work State item: ${state.item}`);
    if (state?.item) stateIds.add(state.item);
  });
  return { valid: failures.length === 0, failures };
};
