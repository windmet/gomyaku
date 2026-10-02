import { compileWorkflowEvidence } from './index.mjs';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const dense = value => Array.isArray(value) && Array.from({length:value.length}, (_, i) => i in value).every(Boolean);
const own = (value, key) => record(value) && Object.hasOwn(value, key) ? value[key] : undefined;
const compare = (a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

// Each slot names a path field in the existing audio-ASR receipt dialect.
// This table deliberately excludes cleanup candidates, commands and un-hashed MSST outputs.
const fixed = {
  '/sourceMedia/path':['sourceMedia','path','sha256','bytes'],
  '/m4a/masterPath':['m4a','masterPath','sha256','bytes'],
  '/whisper/deliverySrt':['whisper','deliverySrt','deliverySha256'],
  '/chat/rawPath':['chat','rawPath','rawSha256'],
  '/chat/normalizedPath':['chat','normalizedPath','normalizedSha256'],
  '/comments/infoPath':['comments','infoPath','infoSha256'],
  '/comments/normalizedPath':['comments','normalizedPath','normalizedSha256'],
};
const descriptor = (receipt, slot) => {
  if (Object.hasOwn(fixed, slot)) {
    const [section, locator, digest, count] = fixed[slot];
    const value = own(receipt, section);
    return {path:own(value,locator), sha256:own(value,digest), byteCount:own(value,count)};
  }
  const match = /^\/(m4aChunks|whisper\/rawChunkOutputs)\/(0|[1-9][0-9]*)\/(path|srt)$/.exec(slot);
  if (!match || (match[1] === 'm4aChunks' ? match[3] !== 'path' : match[3] !== 'srt')) {
    throw new Error(`Unsupported audio-ASR receipt slot: ${slot}`);
  }
  const list = match[1] === 'm4aChunks' ? own(receipt,'m4aChunks') : own(own(receipt,'whisper'),'rawChunkOutputs');
  const position = Number(match[2]);
  if (!dense(list) || !Number.isSafeInteger(position) || position >= list.length || !record(list[position])) {
    throw new Error(`Missing audio-ASR receipt slot: ${slot}`);
  }
  const entry = list[position];
  return match[3] === 'path'
    ? {path:own(entry,'path'), sha256:own(entry,'sha256'), byteCount:own(entry,'bytes')}
    : {path:own(entry,'srt'), sha256:own(entry,'srtSha256'), byteCount:undefined};
};

/** Pure, explicitly selected receipt projection. It does not verify files or transfer completion claims. */
export const projectAudioAsrReceipt = (receipt, configuration) => {
  if (!record(receipt) || receipt.schemaVersion !== 1 || receipt.kind !== 'audio-asr-processing-receipt') {
    throw new Error('Expected a schema-1 audio-asr-processing-receipt.');
  }
  if (!record(configuration) || configuration.schemaVersion !== 1) throw new Error('Expected schema-1 receipt bindings.');
  for (const name of ['sources','bindings','segments','paths']) {
    if (!dense(configuration[name]) || !configuration[name].every(record)) throw new Error(`${name} must be a dense object array.`);
  }
  if (!configuration.bindings.length) throw new Error('Receipt projection requires at least one explicit artifact binding.');
  const slots = new Set();
  const artifacts = configuration.bindings.map(binding => {
    if (typeof binding.slot !== 'string' || slots.has(binding.slot)) throw new Error('Receipt slots must be explicit and unique.');
    slots.add(binding.slot);
    const selected = descriptor(receipt,binding.slot);
    if (selected.byteCount !== undefined && binding.byteCount !== undefined && selected.byteCount !== binding.byteCount) {
      throw new Error(`Byte count supplement conflicts with receipt: ${binding.slot}`);
    }
    return {id:binding.id, sourceId:binding.sourceId, ...selected,
      byteCount:selected.byteCount === undefined ? binding.byteCount : selected.byteCount,
      ...(binding.parents === undefined ? {} : {parents:binding.parents})};
  });
  const evidence = {schemaVersion:1,
    sources:configuration.sources.map(source => ({id:source.id, ...(source.durationMs === undefined ? {} : {durationMs:source.durationMs})})),
    artifacts,
    segments:configuration.segments.map(segment => ({id:segment.id, artifactId:segment.artifactId, startMs:segment.startMs,
      ...(segment.endMs === undefined ? {} : {endMs:segment.endMs})})),
    paths:configuration.paths.map(path => ({id:path.id, nodeIds:path.nodeIds})),
  };
  // Core/Workflow owns identity, closure, anchors, portable paths and derivation validation.
  const compiled = compileWorkflowEvidence(evidence);
  return {schemaVersion:1, sources:compiled.index.sources, artifacts:compiled.artifacts,
    segments:evidence.segments.map(segment => ({...segment})).sort(compare), paths:compiled.index.paths};
};
