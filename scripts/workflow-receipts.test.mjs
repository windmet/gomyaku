import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir, copyFile, link, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { projectAudioAsrReceipt } from 'gomyaku/workflow/receipts';
import { serializeWorkflowEvidence } from 'gomyaku/workflow';
import { verifyWorkflowFiles } from 'gomyaku/workflow/files';

const fixtureRoot = resolve('tests/fixtures/workflow');
const json = name => readFile(join(fixtureRoot,name),'utf8').then(JSON.parse);
const fixture = async () => ({receipt:await json('audio-asr-receipt.json'), configuration:await json('audio-asr-bindings.json')});
const cleanup = target => {
  const inside = relative(resolve(tmpdir()),resolve(target));
  assert(inside && inside !== '..' && !inside.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(inside));
  return rm(target,{recursive:true,force:true});
};

test('existing audio-ASR dialect projects into the same independently verified fictional index', async () => {
  const {receipt,configuration} = await fixture();
  const evidence = projectAudioAsrReceipt(receipt,configuration);
  assert.equal(serializeWorkflowEvidence(evidence),serializeWorkflowEvidence(await json('evidence.json')));
  const report = await verifyWorkflowFiles(evidence,{root:fixtureRoot});
  assert.equal(report.valid,true);
  assert.equal(report.checked,3);
  assert.deepEqual(evidence.sources.map(source => source.durationMs),[5000,10000]);
  assert.equal(evidence.artifacts.length,3, 'Deleted temporary WAV must not be selected');
});

test('every supported slot retains its own path and expected hash, including indexed raw outputs', async () => {
  const {receipt,configuration} = await fixture();
  const digest = n => n.toString(16).padStart(64,'0');
  receipt.sourceMedia.sha256 = digest(0); receipt.sourceMedia.bytes = 10;
  receipt.m4a.sha256 = digest(1); receipt.m4a.bytes = 11;
  receipt.whisper.deliverySha256 = digest(2);
  receipt.chat = {rawPath:'chat.txt',normalizedPath:'chat-normalized.txt',rawSha256:digest(3),normalizedSha256:digest(4)};
  receipt.comments = {infoPath:'comments.txt',normalizedPath:'comments-normalized.txt',infoSha256:digest(5),normalizedSha256:digest(6)};
  receipt.m4aChunks = [{path:'slice.txt',bytes:17,sha256:digest(7)},{path:'slice-two.txt',bytes:18,sha256:digest(8)}];
  receipt.whisper.rawChunkOutputs = [{srt:'raw.txt',srtSha256:digest(9)},{srt:'raw-two.txt',srtSha256:digest(10)}];
  const slots = ['/sourceMedia/path','/m4a/masterPath','/whisper/deliverySrt','/chat/rawPath','/chat/normalizedPath',
    '/comments/infoPath','/comments/normalizedPath','/m4aChunks/0/path','/m4aChunks/1/path',
    '/whisper/rawChunkOutputs/0/srt','/whisper/rawChunkOutputs/1/srt'];
  configuration.bindings = slots.map((slot,i) => ({slot,id:`artifact-${i}`,sourceId:'clock-a',byteCount:10+i}));
  configuration.segments = []; configuration.paths = [];
  const output = projectAudioAsrReceipt(receipt,configuration);
  assert.equal(output.artifacts.length,11);
  for (let i = 0; i < slots.length; i++) {
    const artifact = output.artifacts.find(artifact => artifact.id === `artifact-${i}`);
    assert.equal(artifact.sha256,digest(i)); assert.equal(artifact.byteCount,10+i); assert.deepEqual(artifact.parents,[]);
  }
  assert.equal(output.artifacts.find(artifact => artifact.id === 'artifact-8').path,'slice-two.txt');
  assert.equal(output.artifacts.find(artifact => artifact.id === 'artifact-10').path,'raw-two.txt');
});

test('explicit selection is immutable, deterministic and carries no processing or publication authority', async () => {
  const {receipt,configuration} = await fixture();
  receipt.source.title = 'PRIVATE-TITLE'; receipt.whisper.transcript = 'PRIVATE-TRANSCRIPT';
  receipt.m4a.checkpoint = 'PRIVATE-MACHINE-PATH';
  configuration.sources[0].data = {private:'PRIVATE-SOURCE'};
  configuration.bindings[0].path = 'OVERRIDE'; configuration.bindings[0].sha256 = 'OVERRIDE';
  const before = structuredClone({receipt,configuration});
  const output = projectAudioAsrReceipt(receipt,configuration);
  assert.deepEqual({receipt,configuration},before);
  assert(!/PRIVATE|OVERRIDE|completed|Decode|humanReviewed|publication/.test(JSON.stringify(output)));
  receipt.status = 'failed'; receipt.sourceMedia.fullDecodeExit = 1; receipt.m4a.decodedWithoutError = false;
  configuration.sources.reverse(); configuration.bindings.reverse(); configuration.segments.reverse();
  assert.deepEqual(projectAudioAsrReceipt(receipt,configuration),output, 'Status and decode claims are not byte identity authority');
  output.artifacts[0].parents.push('changed'); output.paths[0].nodeIds.push('changed'); output.sources[0].durationMs++;
  assert.deepEqual(configuration.paths[0].nodeIds,['late','early','late']);
  assert.equal(configuration.sources.find(source => source.id === 'clock-a').durationMs,5000);
});

test('incomplete, conflicting and unsupported bindings fail without manufacturing expected identity', async () => {
  const mutations = [
    (r,c) => {delete c.bindings[2].byteCount;},
    (r,c) => {c.bindings[0].byteCount = 30;},
    (r,c) => {r.sourceMedia.bytes = null; c.bindings[0].byteCount = 29;},
    (r,c) => {delete r.sourceMedia.sha256; c.bindings[0].sha256 = 'a'.repeat(64);},
    (r,c) => {r.sourceMedia.path = '../outside';},
    (r,c) => {c.bindings[0].slot = '/cleanup/candidates/0/path';},
    (r,c) => {c.bindings[0].slot = '/msst/chunks/0/outputPath';},
    (r,c) => {c.bindings[0].slot = '/__proto__/path';},
    (r,c) => {c.bindings[0].slot = '/m4aChunks/01/path';},
    (r,c) => {c.bindings[0].slot = '/m4aChunks/0/srt';},
    (r,c) => {c.bindings[0].slot = '/whisper/rawChunkOutputs/0/path';},
    (r,c) => {c.bindings[0].slot = '/whisper/rawChunkOutputs/0/srt'; r.whisper.rawChunkOutputs = new Array(1);},
    (r,c) => {c.bindings[1].slot = c.bindings[0].slot;},
    (r,c) => {c.bindings[1].id = c.bindings[0].id;},
    (r,c) => {c.bindings[0].sourceId = 'missing';},
    (r,c) => {c.bindings[1].parents = ['independent']; c.bindings[2].parents = ['derived'];},
    (r,c) => {c.segments[0].endMs = 5001;},
    (r,c) => {c.paths[0].nodeIds = ['missing'];},
    (r,c) => {c.bindings = [];},
    (r,c) => {c.bindings = new Array(1);},
    (r,c) => {c.schemaVersion = 2;},
    (r,c) => {r.kind = 'acquisition-receipt';},
    (r,c) => {r.schemaVersion = 2;},
  ];
  for (const mutate of mutations) {
    const {receipt,configuration} = await fixture(); mutate(receipt,configuration);
    assert.throws(() => projectAudioAsrReceipt(receipt,configuration),undefined,mutate.toString());
  }
  assert.throws(() => projectAudioAsrReceipt(null,{}));
  const {receipt} = await fixture();
  assert.throws(() => projectAudioAsrReceipt(receipt,null));
});

test('partial selection leaves unselected missing receipt evidence untouched and promises no full pipeline coverage', async () => {
  const {receipt,configuration} = await fixture();
  delete receipt.m4a; delete receipt.whisper;
  configuration.bindings = configuration.bindings.slice(0,1); configuration.segments = []; configuration.paths = [];
  const output = projectAudioAsrReceipt(receipt,configuration);
  assert.equal(output.artifacts.length,1);
  assert.equal(output.artifacts[0].id,'original');
  assert.equal((await verifyWorkflowFiles(output)).status,'not-run');
});

test('receipt completion cannot hide corrupt bytes and supplemental byte counts are independently checked', async () => {
  const root = await mkdtemp(join(tmpdir(),'gomyaku-receipt-'));
  try {
    const {receipt,configuration} = await fixture();
    for (const name of ['original.txt','derived.txt','independent.txt']) await copyFile(join(fixtureRoot,name),join(root,name));
    const output = projectAudioAsrReceipt(receipt,configuration);
    assert.equal((await verifyWorkflowFiles(output,{root})).valid,true);
    await writeFile(join(root,'independent.txt'),'tampered');
    const failed = await verifyWorkflowFiles(output,{root});
    assert.equal(failed.valid,false);
    assert(failed.files.find(file => file.id === 'independent').failures.some(message => message.includes('SHA256')));
    configuration.bindings[2].byteCount = 999;
    assert.equal((await verifyWorkflowFiles(projectAudioAsrReceipt(receipt,configuration),{root:fixtureRoot})).valid,false);
  } finally {await cleanup(root);}
});

test('detached CLI converts explicit bindings, verifies bytes and protects both receipt inputs', async () => {
  const root = await mkdtemp(join(tmpdir(),'gomyaku-receipt-'));
  try {
    for (const folder of ['core','workflow']) await mkdir(join(root,folder));
    for (const source of ['core/index.mjs','workflow/index.mjs','workflow/files.mjs','workflow/receipts.mjs','workflow/cli.mjs']) {
      await copyFile(new URL(`../src/${source}`,import.meta.url),join(root,source));
    }
    const {receipt,configuration} = await fixture();
    const isolated = await import(pathToFileURL(join(root,'workflow/receipts.mjs')).href);
    assert.deepEqual(isolated.projectAudioAsrReceipt(receipt,configuration),projectAudioAsrReceipt(receipt,configuration));
    const receiptPath = join(root,'receipt.json'); const bindingPath = join(root,'bindings.json'); const output = join(root,'manifest.json');
    await writeFile(receiptPath,JSON.stringify(receipt)); await writeFile(bindingPath,JSON.stringify(configuration));
    const cli = (...args) => spawnSync(process.execPath,[join(root,'workflow/cli.mjs'),...args],{encoding:'utf8',timeout:10000});
    const args = ['receipt','--input',receiptPath,'--bindings',bindingPath];
    const result = cli(...args);
    assert.equal(result.status,0,result.stderr);
    assert.deepEqual(JSON.parse(result.stdout),projectAudioAsrReceipt(receipt,configuration));
    assert.equal(cli(...args,'--out',output).status,0);
    const verified = cli('verify','--input',output,'--root',fixtureRoot);
    assert.equal(verified.status,0,verified.stderr); assert.equal(JSON.parse(verified.stdout).checked,3);
    for (const protectedPath of [receiptPath,bindingPath]) {
      assert.equal(cli(...args,'--out',protectedPath).status,1);
      const alias = `${protectedPath}.alias`; await link(protectedPath,alias);
      assert.equal(cli(...args,'--out',alias).status,1);
    }
    assert.equal(await readFile(receiptPath,'utf8'),JSON.stringify(receipt));
    assert.equal(await readFile(bindingPath,'utf8'),JSON.stringify(configuration));
    assert.equal(cli('receipt','--input',receiptPath).status,2);
    assert.equal(cli(...args,'--root',fixtureRoot).status,2);
    assert.equal(cli('compile','--input',output,'--bindings',bindingPath).status,2);
    await writeFile(bindingPath,'not-json'); assert.equal(cli(...args).status,1);
  } finally {await cleanup(root);}
});
