import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const verifySourceSet = async ({ manifestPath, sourceRoot }) => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const failures = [];

  for (const [role, expected] of Object.entries(manifest.files || {})) {
    if (!expected?.path || !expected?.sha256) {
      failures.push(`${role}: path and sha256 are required`);
      continue;
    }
    const absolutePath = path.resolve(sourceRoot, expected.path);
    let bytes;
    try {
      bytes = await readFile(absolutePath);
    } catch (error) {
      failures.push(`${role}: cannot read ${expected.path}: ${error.message}`);
      continue;
    }

    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== expected.sha256) failures.push(`${role}: sha256 ${sha256} != ${expected.sha256}`);
    if (expected.byteCount !== undefined && bytes.byteLength !== expected.byteCount) {
      failures.push(`${role}: byteCount ${bytes.byteLength} != ${expected.byteCount}`);
    }
    if (expected.lineCount !== undefined || expected.arcCount !== undefined) {
      const text = bytes.toString('utf8');
      const lineCount = text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0);
      if (expected.lineCount !== undefined && lineCount !== expected.lineCount) {
        failures.push(`${role}: lineCount ${lineCount} != ${expected.lineCount}`);
      }
      if (expected.arcCount !== undefined) {
        const arcCount = (text.match(/^# ARC-\d+/gm) || []).length;
        if (arcCount !== expected.arcCount) failures.push(`${role}: arcCount ${arcCount} != ${expected.arcCount}`);
      }
    }
  }

  return {
    sourceSetId: manifest.sourceSetId,
    fileCount: Object.keys(manifest.files || {}).length,
    failures,
  };
};
