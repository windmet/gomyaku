import { createHash } from 'node:crypto';
import { open, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { compileWorkflowEvidence } from './index.mjs';

/** Read-only byte identity audit. It does not attest decoding, timing, transcription, or publication. */
export const verifyWorkflowFiles = async (input, {root} = {}) => {
  const compiled = compileWorkflowEvidence(input);
  const {artifacts} = compiled;
  const identity = {schemaVersion:1, manifestSha256:createHash('sha256').update(JSON.stringify(compiled) + '\n').digest('hex')};
  if (typeof root !== 'string' || !root.trim()) return {
    ...identity, status:'not-run', valid:false, checked:0, files:[], failures:['An explicit evidence root is required.'],
  };
  let rootPath;
  try {
    rootPath = await realpath(root);
    if (!(await stat(rootPath)).isDirectory()) throw new Error('Evidence root must be a directory.');
  }
  catch { return {...identity, status:'unavailable', valid:false, checked:0, files:[], failures:['Evidence root is unavailable.']}; }
  const files = [];
  for (const artifact of artifacts) {
    const failures = [];
    let handle;
    let actual;
    try {
      const target = await realpath(path.resolve(rootPath, artifact.path));
      const relative = path.relative(rootPath, target);
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error('Evidence path resolves outside its root.');
      }
      handle = await open(target, 'r');
      const before = await handle.stat();
      if (!before.isFile()) throw new Error('Evidence must be a regular file.');
      const digest = createHash('sha256');
      let byteCount = 0;
      for await (const bytes of handle.createReadStream({autoClose:false})) {
        digest.update(bytes);
        byteCount += bytes.byteLength;
      }
      actual = {sha256:digest.digest('hex'), byteCount};
      const after = await handle.stat();
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) failures.push('File changed during verification.');
      if (actual.sha256 !== artifact.sha256) failures.push('SHA256 differs from the declared artifact.');
      if (actual.byteCount !== artifact.byteCount) failures.push('Byte count differs from the declared artifact.');
    } catch (error) {
      failures.push(error.code ? 'Evidence file is unavailable or unreadable.' : error.message);
    } finally { await handle?.close(); }
    files.push({id:artifact.id, path:artifact.path, status:failures.length ? 'failed' : 'verified', ...(actual ? {actual} : {}), failures});
  }
  return {...identity, status:'checked', valid:files.every(file => file.status === 'verified'), checked:files.length, files,
    failures:files.flatMap(file => file.failures.map(message => `${file.id}: ${message}`))};
};
