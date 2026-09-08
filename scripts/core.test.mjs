import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileIndex, serializeIndex, validateIndex } from 'gomyaku/core';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const fixture = () => ({ schemaVersion: 1,
  sources: [{ id: 'recording-b' }, { id: 'recording-a', durationMs: 1000 }],
  nodes: [
    { id: 'beta', references: ['alpha', 'alpha'], anchors: [{ sourceId: 'recording-b', startMs: 1 }], data: { z: 1, a: 'fictional' } },
    { id: 'alpha', references: ['beta'], anchors: [{ sourceId: 'recording-a', startMs: 20, endMs: 20 }, { sourceId: 'recording-a', startMs: 20 }] },
  ],
  paths: [{ id: 'reading', nodeIds: ['beta', 'alpha', 'beta'] }],
});

test('resolves references and paths without requiring publication semantics', () => {
  const input = fixture();
  const before = structuredClone(input);
  const result = compileIndex(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result.reverseReferences, [{ nodeId: 'alpha', from: ['beta'] }, { nodeId: 'beta', from: ['alpha'] }]);
  assert.deepEqual(result.paths[0].nodeIds, ['beta', 'alpha', 'beta']);
  assert.deepEqual(result.pathMembership[1].paths, ['reading']);
  assert.deepEqual(result.timelines.map(t => [t.sourceId, t.anchors[0].startMs]), [['recording-a', 20], ['recording-b', 1]]);
  result.nodes[1].data.z = 99;
  assert.equal(input.nodes[0].data.z, 1);
});

test('serialization is stable under unordered input permutations and tied anchors', () => {
  const input = fixture();
  const shuffled = structuredClone(input);
  shuffled.sources.reverse();
  shuffled.nodes.reverse();
  shuffled.nodes.forEach(node => { node.references.reverse(); node.anchors.reverse(); });
  shuffled.nodes[1].data = { a: 'fictional', z: 1 };
  assert.equal(serializeIndex(input), serializeIndex(shuffled));
  shuffled.paths[0].nodeIds.reverse(); // Palindrome remains the same; explicitly change authored order.
  shuffled.paths[0].nodeIds = ['alpha', 'beta', 'beta'];
  assert.notEqual(serializeIndex(input), serializeIndex(shuffled));
});

test('rejects malformed identifiers, references, timing and non-JSON metadata', () => {
  const mutations = [
    x => x.nodes.push(structuredClone(x.nodes[0])),
    x => x.sources[0].id = ' trailing ',
    x => x.nodes[0].references.push('missing'),
    x => x.paths[0].nodeIds.push('missing'),
    x => x.nodes[0].anchors[0].sourceId = 'missing',
    x => x.nodes[1].anchors[0].endMs = 1001,
    x => x.nodes[1].anchors[0].endMs = 19,
    x => x.nodes[1].anchors[0].startMs = -1,
    x => x.sources[0].durationMs = 1.5,
    x => x.nodes[0].data = new Date(),
    x => x.nodes[0].data = { number: Infinity },
    x => x.nodes[0].data = { missing: undefined },
    x => x.nodes[0].data = new Array(2),
    x => x.nodes[0].references = new Array(2),
    x => x.nodes[0].data = x,
  ];
  for (const mutate of mutations) {
    const input = fixture(); mutate(input);
    assert.equal(validateIndex(input).valid, false, mutate.toString());
    assert.throws(() => compileIndex(input), /Invalid index/);
  }
  for (const input of [null, [], {}, { schemaVersion: 1, sources: [null], nodes: [null], paths: [null] }]) {
    assert.equal(validateIndex(input).valid, false);
  }
});

test('empty index and unanchored nodes are valid; no invented timestamps', () => {
  const input = { schemaVersion: 1, sources: [], nodes: [{ id: 'identity', references: [], anchors: [] }], paths: [] };
  assert.deepEqual(compileIndex(input).timelines, []);
  assert.equal(validateIndex({ ...input, nodes: [] }).valid, true);
});

test('core runs as a standalone file without framework, catalog or workspace', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gomyaku-core-'));
  try {
    const target = join(directory, 'core.mjs');
    await copyFile(new URL('../src/core/index.mjs', import.meta.url), target);
    const isolated = await import(pathToFileURL(target).href);
    assert.equal(isolated.serializeIndex(fixture()), serializeIndex(fixture()));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
