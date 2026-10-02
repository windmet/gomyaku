import { createHash } from 'node:crypto';
import { compileWorkflowEvidence } from './index.mjs';
import { auditArtifacts } from './file-audit.mjs';

/** Read-only identity audit; no decoding, transcription or publication authority. */
export const verifyWorkflowFiles = async (input, options) => {
  const compiled = compileWorkflowEvidence(input);
  const identity = {schemaVersion:1, manifestSha256:createHash('sha256').update(JSON.stringify(compiled) + '\n').digest('hex')};
  return {...identity, ...await auditArtifacts(compiled.artifacts, options)};
};
