import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm, symlink, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { compileWorkflowEvidence, serializeWorkflowEvidence, validateWorkflowEvidence } from 'gomyaku/workflow';
import { verifyWorkflowFiles } from 'gomyaku/workflow/files';

const payload = Buffer.from('fictional technical evidence\n');
const sha256 = createHash('sha256').update(payload).digest('hex');
const fixture = () => ({schemaVersion:1,
  sources:[{id:'clock-b', durationMs:10000}, {id:'clock-a', durationMs:5000}],
  artifacts:[
    {id:'derived', sourceId:'clock-a', path:'derived.txt', sha256, byteCount:payload.length, parents:['original']},
    {id:'original', sourceId:'clock-a', path:'original.bin', sha256, byteCount:payload.length},
    {id:'independent', sourceId:'clock-b', path:'independent.txt', sha256, byteCount:payload.length},
  ],
  segments:[{id:'late', artifactId:'independent', startMs:7000, endMs:8000}, {id:'early', artifactId:'derived', startMs:100, endMs:200}],
  paths:[{id:'authored', nodeIds:['late','early','late']}],
});
const directory = () => mkdtemp(join(tmpdir(), 'gomyaku-workflow-'));
// All recursive cleanup stays inside the exact OS-created temporary directory.
const cleanup = target => { assert(resolve(target).startsWith(resolve(tmpdir()) + '\\') || resolve(target).startsWith(resolve(tmpdir()) + '/')); return rm(target, {recursive:true, force:true}); };

test('documented offline fixture verifies real bytes with the public workflow API', async () => {
  const root = resolve('tests/fixtures/workflow');
  const input = JSON.parse(await readFile(join(root,'evidence.json'),'utf8'));
  assert.equal((await verifyWorkflowFiles(input,{root})).valid,true);
  const index = compileWorkflowEvidence(input).index;
  assert.equal(index.nodes.length,5);
  assert.deepEqual(index.paths[0].nodeIds,['late','early','late']);
});

test('technical artifacts and segments consume core references, native clocks and ordered paths', () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = compileWorkflowEvidence(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result.index.reverseReferences.find(node => node.nodeId === 'original').from, ['derived']);
  assert.deepEqual(result.index.reverseReferences.find(node => node.nodeId === 'derived').from, ['early']);
  assert.deepEqual(result.index.timelines.map(source => [source.sourceId, source.anchors[0].startMs]), [['clock-a',100],['clock-b',7000]]);
  assert.deepEqual(result.index.paths[0].nodeIds, ['late','early','late']);
  assert.deepEqual(result.index.pathMembership.find(node => node.nodeId === 'late').paths, ['authored']);
  assert.deepEqual(result.index.nodes.find(node => node.id === 'original').anchors, []);
  assert(!('verified' in result), 'Compilation must not pretend file or media verification happened');
  result.artifacts[0].parents.push('new');
  assert.deepEqual(input, before);
});

test('serialized evidence is deterministic and excludes arbitrary workspace/editorial metadata', () => {
  const input = fixture();
  input.sources[0].data = {privatePath:'PRIVATE-PATH'};
  input.artifacts[0].transcript = 'PRIVATE-COPY';
  input.artifacts[0].parents = ['original','independent','original'];
  input.paths[0].data = {publicationStatus:'EDITORIAL-STATUS'};
  const shuffled = structuredClone(input);
  shuffled.sources.reverse(); shuffled.artifacts.reverse(); shuffled.segments.reverse(); shuffled.paths.reverse();
  shuffled.artifacts.find(artifact => artifact.id === 'derived').parents.reverse();
  assert.equal(serializeWorkflowEvidence(input), serializeWorkflowEvidence(shuffled));
  assert(!/PRIVATE|EDITORIAL/.test(serializeWorkflowEvidence(input)));
  assert(!JSON.stringify(compileWorkflowEvidence(input).index).includes('derived.txt'), 'The generic index has no filesystem locators');
  assert.deepEqual(compileWorkflowEvidence(input).artifacts.find(artifact => artifact.id === 'derived').parents, ['independent','original']);
  shuffled.paths[0].nodeIds = ['early','late','late'];
  assert.notEqual(serializeWorkflowEvidence(input), serializeWorkflowEvidence(shuffled));
});

test('malformed identity, closure, native time, byte identity and derivation are rejected', () => {
  const mutations = [
    x => {x.artifacts[0].id = ' early ';},
    x => {x.artifacts[0].id = 'early';},
    x => {x.artifacts[0].sourceId = 'missing';},
    x => {x.artifacts[0].sha256 = 'unknown';},
    x => {x.artifacts[0].byteCount = -1;},
    x => {x.artifacts[0].byteCount = Number.MAX_SAFE_INTEGER + 1;},
    x => {x.artifacts[0].parents = ['early'];},
    x => {x.artifacts[0].parents = ['derived'];},
    x => {x.artifacts[1].parents = ['derived'];},
    x => {x.artifacts[0].parents = ['missing'];},
    x => {x.artifacts[0].parents = new Array(2);},
    x => {x.segments[0].artifactId = 'missing';},
    x => {x.segments[0].artifactId = 'early';},
    x => {x.segments[0].endMs = 10001;},
    x => {x.segments[0].startMs = -1;},
    x => {x.segments[0].endMs = 6999;},
    x => {x.paths[0].nodeIds = ['missing'];},
    x => {x.segments = new Array(2);},
  ];
  for (const mutate of mutations) {
    const input = fixture(); mutate(input);
    assert.equal(validateWorkflowEvidence(input).valid, false, mutate.toString());
    assert.throws(() => compileWorkflowEvidence(input), /Invalid workflow evidence/);
  }
  for (const input of [null, [], {}, {schemaVersion:1,sources:[null], artifacts:[], segments:[], paths:[]}]) {
    assert.equal(validateWorkflowEvidence(input).valid, false);
  }
});

test('portable paths reject POSIX/Windows absolute, drive-relative, traversal and ambiguous separators', () => {
  for (const path of ['../outside', '/outside', 'C:/outside', 'C:outside', '\\\\server\\file', 'folder\\file', 'a/../b', './file', 'a//b', 'a/', 'https://example.invalid/file', 'file\0x', 'file ', 'NUL', 'con.txt', 'a?/b', 'a./b', 'a /b']) {
    const input = fixture(); input.artifacts[0].path = path;
    assert.equal(validateWorkflowEvidence(input).valid, false, path);
  }
});

test('empty manifests and point observations remain valid without inventing media facts', () => {
  assert.deepEqual(compileWorkflowEvidence({schemaVersion:1,sources:[],artifacts:[],segments:[],paths:[]}).index.timelines, []);
  const input = fixture(); delete input.segments[0].endMs;
  const result = compileWorkflowEvidence(input);
  assert(!('endMs' in result.index.timelines[1].anchors[0]));
});

test('streamed file identity audit distinguishes unrun, unavailable, verified, changed and missing evidence', async () => {
  const root = await directory();
  try {
    const input = fixture();
    assert.equal((await verifyWorkflowFiles(input)).status, 'not-run');
    assert.equal((await verifyWorkflowFiles(input, {root:join(root,'missing')})).status, 'unavailable');
    for (const artifact of input.artifacts) await writeFile(join(root, artifact.path), payload);
    assert.equal((await verifyWorkflowFiles(input, {root:join(root,'derived.txt')})).status, 'unavailable');
    const first = await verifyWorkflowFiles(input, {root});
    assert.equal(first.valid, true);
    assert.equal(first.checked, 3);
    assert.equal(first.manifestSha256, createHash('sha256').update(serializeWorkflowEvidence(input)).digest('hex'));
    const changedDeclaration = structuredClone(input); changedDeclaration.segments[0].startMs++;
    assert.notEqual((await verifyWorkflowFiles(changedDeclaration,{root})).manifestSha256, first.manifestSha256);
    assert.deepEqual(first.files[0].actual, {sha256, byteCount:payload.length});
    await writeFile(join(root,'derived.txt'), 'changed');
    await rm(join(root,'independent.txt'));
    const second = await verifyWorkflowFiles(input, {root});
    assert.equal(second.valid, false);
    assert.equal(second.checked, 3);
    assert.equal(second.files.find(file => file.id === 'original').status, 'verified');
    assert(second.failures.some(failure => failure.includes('SHA256')));
    assert(second.failures.some(failure => failure.includes('Byte count')));
    assert(second.failures.some(failure => failure.includes('unavailable')));
    assert(!JSON.stringify(second).includes(root), 'Report must not embed the absolute machine root');
  } finally { await cleanup(root); }
});

test('directory evidence and links escaping the root are rejected before hashing', async () => {
  const root = await directory();
  try {
    await mkdir(join(root,'inside'));
    await mkdir(join(root,'outside'));
    await writeFile(join(root,'outside','evidence.txt'), payload);
    await symlink(join(root,'outside'), join(root,'inside','escape'), process.platform === 'win32' ? 'junction' : 'dir');
    const input = fixture(); input.artifacts = [input.artifacts[1]]; input.segments = []; input.paths = [];
    input.artifacts[0].path = 'escape/evidence.txt';
    const escaped = await verifyWorkflowFiles(input, {root:join(root,'inside')});
    assert.equal(escaped.valid, false);
    assert(escaped.failures[0].includes('outside'));
    assert(!escaped.files[0].actual);
    input.artifacts[0].path = 'outside';
    const folder = await verifyWorkflowFiles(input, {root});
    assert(folder.failures[0].includes('regular file'));
  } finally { await cleanup(root); }
});

test('detached workflow CLI proves projection, file checking, errors and package independence', async () => {
  const root = await directory();
  try {
    for (const folder of ['core','workflow']) await mkdir(join(root,folder));
    for (const source of ['core/index.mjs','workflow/index.mjs','workflow/files.mjs','workflow/file-audit.mjs','workflow/receipt-selection.mjs','workflow/receipt-files.mjs','workflow/receipts.mjs','workflow/cli.mjs']) {
      await copyFile(new URL(`../src/${source}`, import.meta.url), join(root,source));
    }
    const input = fixture();
    for (const artifact of input.artifacts) await writeFile(join(root,artifact.path), payload);
    const manifest = join(root,'evidence.json');
    await writeFile(manifest, JSON.stringify(input));
    const isolated = await import(pathToFileURL(join(root,'workflow/index.mjs')).href);
    assert.equal(isolated.serializeWorkflowEvidence(input), serializeWorkflowEvidence(input));
    const cli = (...args) => spawnSync(process.execPath, [join(root,'workflow/cli.mjs'), ...args], {encoding:'utf8', timeout:10000});
    const compiled = cli('compile','--input',manifest);
    assert.equal(compiled.status,0,compiled.stderr);
    assert.equal(compiled.stdout,serializeWorkflowEvidence(input));
    const verified = cli('verify','--input',manifest,'--root',root);
    assert.equal(verified.status,0,verified.stderr);
    assert.equal(JSON.parse(verified.stdout).valid,true);
    const output = join(root,'compiled.json');
    assert.equal(cli('compile','--input',manifest,'--out',output).status,0);
    assert.equal(await readFile(output,'utf8'),compiled.stdout);
    assert.equal(await readFile(manifest,'utf8'),JSON.stringify(input), 'CLI must leave input unchanged');
    assert.equal(cli('compile','--input',manifest,'--out',manifest).status,1);
    assert.equal(cli('verify','--input',manifest,'--root',root,'--out',join(root,'original.bin')).status,1);
    await link(join(root,'original.bin'),join(root,'alias.bin'));
    assert.equal(cli('verify','--input',manifest,'--root',root,'--out',join(root,'alias.bin')).status,1);
    assert.deepEqual(await readFile(join(root,'original.bin')),payload);
    assert.equal(cli('verify','--input',manifest).status,2);
    assert.equal(cli('compile','--input',manifest,'--root',root).status,2);
    assert.equal(cli('unknown','--input',manifest).status,2);
    await writeFile(join(root,'derived.txt'),'corrupt');
    assert.equal(cli('verify','--input',manifest,'--root',root).status,1);
    await writeFile(manifest,'not-json');
    assert.equal(cli('compile','--input',manifest).status,1);
  } finally { await cleanup(root); }
});
