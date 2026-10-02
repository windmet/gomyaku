import { readFile, writeFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { compileWorkflowEvidence } from './index.mjs';
import { verifyWorkflowFiles } from './files.mjs';
import { projectAudioAsrReceipt } from './receipts.mjs';

const args = process.argv.slice(2);
const usage = 'Usage: gomyaku-workflow compile|verify|receipt --input <json> [--out <json>] (verify requires --root <directory>; receipt requires --bindings <json>)';
const command = args.shift();
const options = {};
let usageError = !['compile','verify','receipt'].includes(command);
while (args.length) {
  const flag = args.shift();
  const value = args.shift();
  if (!['--input','--out','--root','--bindings'].includes(flag) || !value || value.startsWith('--') || options[flag]) usageError = true;
  options[flag] = value;
}
if (!options['--input'] || (command === 'verify' && !options['--root']) || (command !== 'verify' && options['--root'])
  || (command === 'receipt' ? !options['--bindings'] : options['--bindings'])) usageError = true;
if (usageError) {
  console.error(usage);
  process.exitCode = 2;
} else {
  try {
    const input = JSON.parse(await readFile(options['--input'], 'utf8'));
    const evidence = command === 'receipt'
      ? projectAudioAsrReceipt(input, JSON.parse(await readFile(options['--bindings'],'utf8'))) : input;
    const compiled = compileWorkflowEvidence(evidence);
    if (options['--out']) {
      const identify = async filename => {
        try { return {path:await realpath(filename), stat:await stat(filename)}; }
        catch (error) { if (error.code === 'ENOENT') return {path:path.resolve(filename)}; throw error; }
      };
      const destination = await identify(options['--out']);
      const originals = [options['--input'], ...(command === 'receipt' ? [options['--bindings']] : []), ...(command === 'verify'
        ? compiled.artifacts.map(artifact => path.resolve(options['--root'], artifact.path)) : [])];
      for (const original of originals) {
        const source = await identify(original);
        const comparable = value => process.platform === 'win32' ? value.toLowerCase() : value;
        if (comparable(destination.path) === comparable(source.path)
          || (destination.stat && source.stat && destination.stat.ino !== 0
            && destination.stat.ino === source.stat.ino && destination.stat.dev === source.stat.dev)) {
          throw new Error('--out must not overwrite the input manifest or verified evidence.');
        }
      }
    }
    const report = command === 'verify' ? await verifyWorkflowFiles(input, {root:options['--root']}) : null;
    const output = JSON.stringify(report || (command === 'receipt' ? evidence : compiled)) + '\n';
    if (options['--out']) await writeFile(options['--out'], output);
    else process.stdout.write(output);
    if (report && !report.valid) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
