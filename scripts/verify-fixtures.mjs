import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compileProject } from '../src/compiler/compileProject.mjs';
import { validateArchivePackage } from '../src/validation/projectPackage.mjs';

const root = path.resolve('tests/fixtures/gomyaku');
const cases = [
  ['simple', { tracks: 1, acts: 6, events: 12, threads: 0 }],
  ['multi-track', { tracks: 3, threads: 1 }],
  ['public-record', { people: 3, sources: 2 }],
];

for (const [name, expected] of cases) {
  const fixture = JSON.parse(await readFile(path.join(root, `${name}.json`), 'utf8'));
  const validation = validateArchivePackage(fixture);
  if (!validation.valid) throw new Error(`${name}: ${validation.failures.join('; ')}`);
  for (const [key, value] of Object.entries(expected)) {
    if ((fixture[key] || []).length !== value) throw new Error(`${name}: expected ${key}=${value}`);
  }
  const first = compileProject(fixture);
  const second = compileProject(fixture);
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error(`${name}: compiler is not deterministic`);
}

console.log('GOMYAKU standalone fixtures verified (validation + deterministic compile).');
