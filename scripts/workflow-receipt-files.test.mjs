import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, copyFile, mkdir, link, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, join, relative, isAbsolute} from 'node:path';
import {spawnSync} from 'node:child_process';
import {prepareAudioAsrReceipt} from 'gomyaku/workflow/receipt-files';
import {projectAudioAsrReceipt} from 'gomyaku/workflow/receipts';
const fixtureRoot = resolve('tests/fixtures/workflow');
const fixture = async () => {
  const receipt = JSON.parse(await readFile(join(fixtureRoot,'audio-asr-receipt.json'),'utf8'));
  const configuration = JSON.parse(await readFile(join(fixtureRoot,'audio-asr-bindings.json'),'utf8'));
  delete configuration.bindings[2].byteCount;
  return {receipt,configuration};
};
const cleanup = target => {
  const inside = relative(resolve(tmpdir()),resolve(target));
  assert(inside && inside !== '..' && !inside.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(inside));
  return rm(target,{recursive:true,force:true});
};
const failed = result => {
  assert.equal(result.valid,false); assert.equal(result.configuration,null); assert.equal(result.evidence,null);
  assert.deepEqual(result.supplements,[]);
};

test('missing counts are prepared only from matching historical hashes, then fully reverified', async () => {
  const {receipt,configuration} = await fixture();
  const before = structuredClone({receipt,configuration});
  assert.throws(() => projectAudioAsrReceipt(receipt,configuration));
  const result = await prepareAudioAsrReceipt(receipt,configuration,{root:fixtureRoot});
  assert.equal(result.status,'prepared'); assert.equal(result.valid,true);
  assert.equal(result.observation.checked,3); assert.equal(result.verification.checked,3); assert.equal(result.verification.valid,true);
  assert.deepEqual(result.supplements,[{id:'independent',slot:'/whisper/deliverySrt',sha256:receipt.whisper.deliverySha256,
    byteCount:29,origin:'hash-matched-current-observation'}]);
  assert.deepEqual(result.evidence,projectAudioAsrReceipt(receipt,result.configuration));
  assert.equal(result.configuration.bindings.find(b => b.id === 'original').byteCount,29);
  assert.deepEqual({receipt,configuration},before);
});

test('no root, unavailable root, and incorrect declared counts never promote observations', async () => {
  const {receipt,configuration} = await fixture();
  const missing = await prepareAudioAsrReceipt(receipt,configuration); failed(missing); assert.equal(missing.status,'not-run');
  const unavailable = await prepareAudioAsrReceipt(receipt,configuration,{root:join(fixtureRoot,'missing')});
  failed(unavailable); assert.equal(unavailable.status,'unavailable');
  configuration.bindings[2].byteCount = 0;
  const wrong = await prepareAudioAsrReceipt(receipt,configuration,{root:fixtureRoot}); failed(wrong);
  assert.notEqual(wrong.selectionSha256,missing.selectionSha256);
  assert.equal(wrong.observation.files.find(f => f.id === 'independent').actual.byteCount,29);
  assert.equal(configuration.bindings[2].byteCount,0);
});

test('invalid closure, path, hash or present count is rejected before filesystem observations', async () => {
  for (const mutate of [
    (r,c) => {r.sourceMedia.bytes = null;},
    (r,c) => {c.bindings[2].byteCount = -1;},
    (r,c) => {c.bindings[0].byteCount = 999;},
    (r,c) => {r.sourceMedia.path = '../escape';},
    (r,c) => {delete r.sourceMedia.sha256;},
    (r,c) => {c.bindings[1].sourceId = 'missing';},
    (r,c) => {c.paths[0].nodeIds = ['missing'];},
    (r,c) => {c.segments[0].endMs = 5001;},
  ]) {
    const {receipt,configuration} = await fixture(); mutate(receipt,configuration);
    await assert.rejects(prepareAudioAsrReceipt(receipt,configuration,{root:join(fixtureRoot,'missing')}));
  }
});

test('asynchronous preparation snapshots caller declarations and emits no private metadata', async () => {
  const {receipt,configuration} = await fixture();
  receipt.source.title = 'PRIVATE TITLE'; receipt.whisper.transcript = 'PRIVATE TEXT';
  configuration.sources[0].private = 'PRIVATE'; configuration.bindings[0].extra = 'PRIVATE';
  const options = {root:fixtureRoot};
  const pending = prepareAudioAsrReceipt(receipt,configuration,options);
  receipt.sourceMedia.sha256 = '0'.repeat(64); configuration.paths[0].nodeIds.push('missing');
  configuration.sources[0].durationMs = 1; configuration.bindings[2].byteCount = 999; options.root = 'unavailable';
  const result = await pending; assert.equal(result.valid,true);
  assert(!/PRIVATE|transcript|completed|publication|decodedWithoutError/.test(JSON.stringify(result)));
  assert.deepEqual(result.evidence.paths[0].nodeIds,['late','early','late']);
});

test('changed, missing and non-file evidence produces no partially prepared bundle', async () => {
  const root = await mkdtemp(join(tmpdir(),'gomyaku-prepare-'));
  try {
    const {receipt,configuration} = await fixture();
    for (const name of ['original.txt','derived.txt','independent.txt']) await copyFile(join(fixtureRoot,name),join(root,name));
    await writeFile(join(root,'independent.txt'),'tampered');
    let result = await prepareAudioAsrReceipt(receipt,configuration,{root}); failed(result);
    assert.equal(result.status,'failed'); assert(result.observation.failures.some(f => f.includes('SHA256')));
    await rm(join(root,'independent.txt')); failed(await prepareAudioAsrReceipt(receipt,configuration,{root}));
    await mkdir(join(root,'independent.txt')); failed(await prepareAudioAsrReceipt(receipt,configuration,{root}));
  } finally {await cleanup(root);}
});

test('detached receipt-prepare CLI prepares fictional files and refuses input/evidence aliases', async () => {
  const root = await mkdtemp(join(tmpdir(),'gomyaku-prepare-'));
  try {
    for (const folder of ['core','workflow']) await mkdir(join(root,folder));
    for (const source of ['core/index.mjs','workflow/index.mjs','workflow/files.mjs','workflow/file-audit.mjs',
      'workflow/receipts.mjs','workflow/receipt-selection.mjs','workflow/receipt-files.mjs','workflow/cli.mjs']) {
      await copyFile(new URL(`../src/${source}`,import.meta.url),join(root,source));
    }
    const {receipt,configuration} = await fixture();
    const receiptPath = join(root,'receipt.json'), bindingPath = join(root,'bindings.json');
    await writeFile(receiptPath,JSON.stringify(receipt)); await writeFile(bindingPath,JSON.stringify(configuration));
    for (const name of ['original.txt','derived.txt','independent.txt']) await copyFile(join(fixtureRoot,name),join(root,name));
    const cli = (...args) => spawnSync(process.execPath,[join(root,'workflow/cli.mjs'),...args],{encoding:'utf8',timeout:10000});
    const args = ['receipt-prepare','--input',receiptPath,'--bindings',bindingPath,'--root',root];
    const result = cli(...args); assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).verification.checked,3);
    const output = join(root,'prepared.json'); assert.equal(cli(...args,'--out',output).status,0);
    for (const protectedPath of [receiptPath,bindingPath,join(root,'independent.txt')]) {
      const before = await readFile(protectedPath);
      assert.equal(cli(...args,'--out',protectedPath).status,1);
      const alias = `${protectedPath}.alias`; await link(protectedPath,alias);
      assert.equal(cli(...args,'--out',alias).status,1);
      assert.deepEqual(await readFile(protectedPath),before);
    }
    assert.equal(cli('receipt-prepare','--input',receiptPath,'--bindings',bindingPath).status,2);
    assert.equal(cli('receipt-prepare','--input',receiptPath,'--root',root).status,2);
    await writeFile(join(root,'independent.txt'),'tampered');
    const corrupt = cli(...args); assert.equal(corrupt.status,1,corrupt.stderr); failed(JSON.parse(corrupt.stdout));
  } finally {await cleanup(root);}
});
