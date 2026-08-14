import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileProject } from '../compiler/compileProject.mjs';
import { validateArchivePackage } from '../validation/projectPackage.mjs';

const command = process.argv[2] || 'help';
const inputFlag = process.argv.indexOf('--input');
const outputFlag = process.argv.indexOf('--out');
const inputPath = inputFlag >= 0 ? process.argv[inputFlag + 1] : undefined;
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;

if (!inputPath && command !== 'help') {
  console.error('Usage: gomyaku <validate|compile> --input <canonical-package.json> [--out <portable-package.json>]');
  process.exit(2);
}

if (command === 'help') {
  console.log('gomyaku validate|compile --input <canonical-package.json> [--out <portable-package.json>]');
  process.exit(0);
}

const input = JSON.parse(await readFile(path.resolve(inputPath), 'utf8'));
if (command === 'validate') {
  const result = validateArchivePackage(input);
  if (!result.valid) {
    result.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('Canonical archive package is valid.');
} else if (command === 'compile') {
  const output = compileProject(input);
  if (outputPath) await writeFile(path.resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  else console.log(JSON.stringify(output, null, 2));
  console.error('Portable archive package compiled.');
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}
