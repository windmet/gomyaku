import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve('.');
const cli = path.resolve('src/cli/gomyaku.mjs');
const plan = path.resolve('tests/fixtures/catalog/acquisition-plan.json');
const validReceipt = path.resolve('tests/fixtures/catalog/acquisition-receipt.json');
const temporary = mkdtempSync(path.join(os.tmpdir(), 'gomyaku-cli-exit-'));

const run = (argumentsList) => spawnSync(process.execPath, [cli, ...argumentsList], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
});

try {
  const valid = run([
    'acquire', 'verify-receipt',
    '--plan', plan,
    '--receipt', validReceipt,
    '--evidence-root', root,
  ]);
  if (valid.status !== 0) {
    throw new Error(`valid receipt unexpectedly exited ${valid.status}: ${valid.stderr}`);
  }

  const invalidReceipt = path.join(temporary, 'invalid-receipt.json');
  const invalidDocument = JSON.parse(readFileSync(validReceipt, 'utf8'));
  invalidDocument.artifacts = invalidDocument.artifacts.slice(0, 1);
  writeFileSync(invalidReceipt, `${JSON.stringify(invalidDocument, null, 2)}\n`, 'utf8');
  const invalid = run([
    'acquire', 'verify-receipt',
    '--plan', plan,
    '--receipt', invalidReceipt,
    '--evidence-root', root,
  ]);
  if (invalid.status !== 1) {
    throw new Error(`invalid receipt unexpectedly exited ${invalid.status}: ${invalid.stdout}\n${invalid.stderr}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log('GOMYAKU CLI exit codes verified (valid receipt 0, invalid receipt 1).');
