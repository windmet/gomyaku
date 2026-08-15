import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

export const checkEvidenceFiles = async ({ records = [], root } = {}) => {
  if (!root) return { status: 'not-run', root: null, checked: 0, missing: 0, failures: [] };
  let rootRealPath;
  try {
    rootRealPath = await realpath(path.resolve(root));
  } catch {
    return {
      status: 'checked',
      root: path.resolve(root),
      checked: 0,
      missing: 0,
      failures: [`evidence root is unavailable: ${root}`],
    };
  }
  const failures = [];
  let checked = 0;
  let missing = 0;
  for (const record of records) {
    if (!Array.isArray(record?.evidence)) continue;
    const recordId = record.item || record.id || 'unknown';
    for (const evidence of record.evidence) {
      if (typeof evidence !== 'string' || !evidence.trim()) continue;
      checked += 1;
      const candidate = path.resolve(rootRealPath, evidence);
      try {
        const resolved = await realpath(candidate);
        const relative = path.relative(rootRealPath, resolved);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          failures.push(`${recordId}: evidence escapes workspace: ${evidence}`);
          missing += 1;
        } else {
          await stat(resolved);
        }
      } catch {
        failures.push(`${recordId}: evidence file is missing: ${evidence}`);
        missing += 1;
      }
    }
  }
  return { status: 'checked', root: rootRealPath, checked, missing, failures };
};
