/** Pure index primitives. No filesystem, media tooling, or publication vocabulary. */
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const validId = value => typeof value === 'string' && value.length > 0 && value.trim() === value;
const time = value => Number.isSafeInteger(value) && value >= 0;
const denseArray = value => Array.isArray(value) && Array.from({ length: value.length }, (_, index) => index in value).every(Boolean);

const canonicalJson = (value, ancestors = new Set()) => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || ancestors.has(value)) throw new Error('data must be finite, acyclic JSON');
  if (Array.isArray(value) && !denseArray(value)) throw new Error('data arrays must not contain holes');
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error('data must contain plain JSON objects');
  ancestors.add(value);
  const result = Array.isArray(value)
    ? value.map(item => canonicalJson(item, ancestors))
    : Object.fromEntries(Object.keys(value).sort(compare).map(key => [key, canonicalJson(value[key], ancestors)]));
  ancestors.delete(value);
  return result;
};

export const validateIndex = input => {
  const failures = [];
  const fail = (path, message) => failures.push({ path, message });
  if (!input || typeof input !== 'object' || input.schemaVersion !== 1) fail('schemaVersion', 'expected 1');
  const collections = {};
  for (const name of ['sources', 'nodes', 'paths']) {
    const entries = input?.[name];
    if (!denseArray(entries)) { fail(name, 'expected a dense array'); collections[name] = []; continue; }
    collections[name] = entries;
    const seen = new Set();
    entries.forEach((entry, index) => {
      const path = `${name}[${index}]`;
      if (!entry || typeof entry !== 'object' || !validId(entry.id)) { fail(`${path}.id`, 'expected a nonempty stable id'); return; }
      if (seen.has(entry.id)) fail(`${path}.id`, `duplicate id ${entry.id}`);
      seen.add(entry.id);
      if (entry.data !== undefined) {
        try { canonicalJson(entry.data); } catch (error) { fail(`${path}.data`, error.message); }
      }
    });
  }
  const sources = new Map(collections.sources.filter(Boolean).map(source => [source.id, source]));
  const nodeIds = new Set(collections.nodes.filter(Boolean).map(node => node.id));
  collections.sources.forEach((source, index) => {
    if (source?.durationMs !== undefined && !time(source.durationMs)) fail(`sources[${index}].durationMs`, 'expected nonnegative integer milliseconds');
  });
  collections.nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') return;
    const path = `nodes[${index}]`;
    if (!denseArray(node.references)) fail(`${path}.references`, 'expected a dense array');
    else node.references.forEach((id, offset) => {
      if (!validId(id) || !nodeIds.has(id)) fail(`${path}.references[${offset}]`, `missing node ${String(id)}`);
    });
    if (!denseArray(node.anchors)) fail(`${path}.anchors`, 'expected a dense array');
    else node.anchors.forEach((anchor, offset) => {
      const at = `${path}.anchors[${offset}]`;
      const source = sources.get(anchor?.sourceId);
      if (!source || !validId(anchor?.sourceId)) fail(`${at}.sourceId`, 'missing source');
      if (!time(anchor?.startMs)) fail(`${at}.startMs`, 'expected nonnegative integer milliseconds');
      if (anchor?.endMs !== undefined && (!time(anchor.endMs) || anchor.endMs < anchor.startMs)) fail(`${at}.endMs`, 'must be at or after startMs');
      if (source?.durationMs !== undefined && (anchor?.endMs ?? anchor?.startMs) > source.durationMs) fail(at, 'anchor exceeds source duration');
    });
  });
  collections.paths.forEach((entry, index) => {
    if (!denseArray(entry?.nodeIds)) fail(`paths[${index}].nodeIds`, 'expected a dense ordered array');
    else entry.nodeIds.forEach((id, offset) => {
      if (!validId(id) || !nodeIds.has(id)) fail(`paths[${index}].nodeIds[${offset}]`, `missing node ${String(id)}`);
    });
  });
  return { valid: failures.length === 0, failures };
};

const data = entry => entry.data === undefined ? {} : { data: canonicalJson(entry.data) };
const byId = (a, b) => compare(a.id, b.id);
const byAnchor = (a, b) => compare(a.sourceId, b.sourceId) || a.startMs - b.startMs
  || (a.endMs ?? a.startMs) - (b.endMs ?? b.startMs)
  || Number(a.endMs !== undefined) - Number(b.endMs !== undefined);

export const compileIndex = input => {
  const validation = validateIndex(input);
  if (!validation.valid) throw new Error(`Invalid index: ${validation.failures.map(f => `${f.path}: ${f.message}`).join('; ')}`);
  const sources = input.sources.map(source => ({ id: source.id,
    ...(source.durationMs === undefined ? {} : { durationMs: source.durationMs }), ...data(source) })).sort(byId);
  const nodes = input.nodes.map(node => ({ id: node.id,
    references: [...new Set(node.references)].sort(compare),
    anchors: node.anchors.map(anchor => ({ sourceId: anchor.sourceId, startMs: anchor.startMs,
      ...(anchor.endMs === undefined ? {} : { endMs: anchor.endMs }) })).sort(byAnchor), ...data(node) })).sort(byId);
  const paths = input.paths.map(entry => ({ id: entry.id, nodeIds: [...entry.nodeIds], ...data(entry) })).sort(byId);
  const incoming = new Map(nodes.map(node => [node.id, []]));
  const membership = new Map(nodes.map(node => [node.id, []]));
  const timelines = new Map(sources.map(source => [source.id, []]));
  for (const node of nodes) {
    for (const target of node.references) incoming.get(target).push(node.id);
    for (const anchor of node.anchors) {
      const { sourceId, ...position } = anchor;
      timelines.get(sourceId).push({ nodeId: node.id, ...position });
    }
  }
  for (const entry of paths) for (const id of new Set(entry.nodeIds)) membership.get(id).push(entry.id);
  return { schemaVersion: 1, sources, nodes, paths,
    reverseReferences: nodes.map(node => ({ nodeId: node.id, from: incoming.get(node.id) })),
    pathMembership: nodes.map(node => ({ nodeId: node.id, paths: membership.get(node.id) })),
    timelines: sources.map(source => ({ sourceId: source.id, anchors: timelines.get(source.id)
      .sort((a, b) => byAnchor(a, b) || compare(a.nodeId, b.nodeId)) })),
  };
};

export const serializeIndex = input => JSON.stringify(canonicalJson(compileIndex(input))) + '\n';
