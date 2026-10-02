import { compileIndex, validateIndex } from '../core/index.mjs';

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const dense = value => Array.isArray(value) && Array.from({length:value.length}, (_, i) => i in value).every(Boolean);
const id = value => typeof value === 'string' && value.length > 0 && value.trim() === value;
const count = value => Number.isSafeInteger(value) && value >= 0;
// Slash-separated relative paths have the same meaning on Windows and POSIX.
const portablePath = value => typeof value === 'string' && value.trim() === value && value.length > 0
  && !/[\\<>:"|?*\x00-\x1f]/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..'
    && !/[. ]$/.test(part) && !/^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³]|CONIN\$|CONOUT\$)(\.|$)/i.test(part));

const project = input => {
  const artifacts = new Map(input.artifacts.map(artifact => [artifact.id, artifact]));
  return {
    schemaVersion: 1,
    sources: input.sources.map(source => ({ id: source.id,
      ...(source.durationMs === undefined ? {} : {durationMs:source.durationMs}) })),
    nodes: [
      ...input.artifacts.map(artifact => ({ id: artifact.id, references: artifact.parents || [], anchors: [], data: {kind:'artifact'} })),
      ...input.segments.map(segment => ({ id:segment.id, references:[segment.artifactId],
        anchors:[{ sourceId:artifacts.get(segment.artifactId)?.sourceId, startMs:segment.startMs,
          ...(segment.endMs === undefined ? {} : {endMs:segment.endMs}) }], data:{kind:'segment'} })),
    ],
    paths: input.paths.map(path => ({id:path.id, nodeIds:path.nodeIds})),
  };
};

export const validateWorkflowEvidence = input => {
  const failures = [];
  const fail = (path, message) => failures.push({path, message});
  if (!record(input)) return {valid:false, failures:[{path:'', message:'expected an evidence manifest object'}]};
  if (input.schemaVersion !== 1) fail('schemaVersion', 'expected 1');
  for (const name of ['sources', 'artifacts', 'segments', 'paths']) {
    if (!dense(input[name])) fail(name, 'expected a dense array');
    else input[name].forEach((entry, i) => { if (!record(entry)) fail(`${name}[${i}]`, 'expected an object'); });
  }
  if (failures.length) return {valid:false, failures};
  const sourceIds = new Set(input.sources.map(source => source.id));
  input.artifacts.forEach((artifact, i) => {
    const at = `artifacts[${i}]`;
    if (!id(artifact.sourceId) || !sourceIds.has(artifact.sourceId)) fail(`${at}.sourceId`, 'missing declared source clock');
    if (!portablePath(artifact.path)) fail(`${at}.path`, 'expected a portable workspace-relative path');
    if (typeof artifact.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(artifact.sha256)) fail(`${at}.sha256`, 'expected a lowercase SHA256');
    if (!count(artifact.byteCount)) fail(`${at}.byteCount`, 'expected a nonnegative safe integer');
    if (artifact.parents !== undefined && !dense(artifact.parents)) fail(`${at}.parents`, 'expected a dense array');
  });
  if (failures.length) return {valid:false, failures};
  const validation = validateIndex(project(input));
  failures.push(...validation.failures);
  if (validation.valid) {
    // A technical derivation cannot be its own ancestor. Core graph cycles remain valid elsewhere.
    const artifacts = new Map(input.artifacts.map(artifact => [artifact.id, artifact]));
    const remaining = new Map(input.artifacts.map(artifact => [artifact.id, new Set(artifact.parents || []).size]));
    const children = new Map(input.artifacts.map(artifact => [artifact.id, []]));
    for (const artifact of input.artifacts) for (const parent of new Set(artifact.parents || [])) {
      if (!artifacts.has(parent)) fail(`artifacts/${artifact.id}/parents`, 'parents must identify artifacts, not segments');
      else children.get(parent).push(artifact.id);
    }
    const ready = [...remaining].filter(([, n]) => n === 0).map(([key]) => key);
    for (let i = 0; i < ready.length; i++) for (const child of children.get(ready[i])) {
      remaining.set(child, remaining.get(child) - 1);
      if (remaining.get(child) === 0) ready.push(child);
    }
    if (ready.length !== input.artifacts.length) fail('artifacts.parents', 'artifact derivation must be acyclic');
  }
  return {valid:failures.length === 0, failures};
};

/** Pure declared-evidence projection. Compilation performs no file or media verification. */
export const compileWorkflowEvidence = input => {
  const validation = validateWorkflowEvidence(input);
  if (!validation.valid) throw new Error(`Invalid workflow evidence: ${validation.failures.map(f => `${f.path}: ${f.message}`).join('; ')}`);
  return {
    schemaVersion:1,
    index:compileIndex(project(input)),
    artifacts:input.artifacts.map(artifact => ({ id:artifact.id, sourceId:artifact.sourceId,
      path:artifact.path, sha256:artifact.sha256, byteCount:artifact.byteCount,
      parents:[...new Set(artifact.parents || [])].sort(compare) })).sort((a,b) => compare(a.id,b.id)),
  };
};

export const serializeWorkflowEvidence = input => JSON.stringify(compileWorkflowEvidence(input)) + '\n';
