import { createHash } from 'node:crypto';
import { selectAudioAsrReceipt } from './receipt-selection.mjs';
import { compileWorkflowEvidence } from './index.mjs';
import { auditArtifacts } from './file-audit.mjs';
import { verifyWorkflowFiles } from './files.mjs';

/** Fill only absent counts from hash-matched observations, then recheck the complete manifest. */
export const prepareAudioAsrReceipt = async (receipt, configuration, options) => {
  const auditOptions = {root:options?.root};
  const selected = selectAudioAsrReceipt(receipt, configuration, {allowMissingCounts:true});
  const slots = new Map(configuration.bindings.map(binding => [binding.id, binding.slot]));
  // Snapshot before the first await: later caller mutation cannot change declared identity.
  const capturedConfiguration = {schemaVersion:1, sources:selected.sources, segments:selected.segments, paths:selected.paths,
    bindings:selected.artifacts.map(artifact => ({id:artifact.id, slot:slots.get(artifact.id), sourceId:artifact.sourceId,
      parents:artifact.parents, ...(artifact.byteCount === undefined ? {} : {byteCount:artifact.byteCount})}))};
  const identity = {schemaVersion:1, selectionSha256:createHash('sha256').update(JSON.stringify(selected) + '\n').digest('hex')};
  const observation = await auditArtifacts(selected.artifacts, auditOptions);
  const failed = (status, verification = null) => ({...identity, status, valid:false, observation, verification,
    configuration:null, evidence:null, supplements:[]});
  if (!observation.valid) return failed(observation.status === 'checked' ? 'failed' : observation.status);
  const measured = new Map(observation.files.map(file => [file.id, file.actual]));
  const supplements = [];
  for (const binding of capturedConfiguration.bindings) {
    if (binding.byteCount !== undefined) continue;
    const {sha256, byteCount} = measured.get(binding.id);
    binding.byteCount = byteCount;
    supplements.push({id:binding.id, slot:binding.slot, sha256, byteCount, origin:'hash-matched-current-observation'});
  }
  const counts = new Map(capturedConfiguration.bindings.map(binding => [binding.id, binding.byteCount]));
  const evidence = {...selected, artifacts:selected.artifacts.map(artifact => ({...artifact, byteCount:counts.get(artifact.id)}))};
  compileWorkflowEvidence(evidence);
  const verification = await verifyWorkflowFiles(evidence, auditOptions);
  if (!verification.valid) return failed(verification.status === 'checked' ? 'failed' : verification.status, verification);
  return {...identity, status:'prepared', valid:true, observation, verification,
    configuration:capturedConfiguration, evidence, supplements};
};
