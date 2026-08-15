import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertCatalogDescriptor, assertMediaItem } from '../model/catalogPackage.mjs';

const emptyJsonl = '';

export const createCatalogWorkspacePaths = (workspaceRoot) => {
  const root = path.resolve(workspaceRoot);
  return {
    root,
    descriptor: path.join(root, 'catalog.yaml'),
    items: path.join(root, 'items.jsonl'),
    classifications: path.join(root, 'classifications.jsonl'),
    overrides: path.join(root, 'overrides.yaml'),
    workState: path.join(root, 'work-state.jsonl'),
    raw: path.join(root, 'raw', 'yt-dlp'),
    generated: path.join(root, 'generated'),
  };
};

const writeIfMissing = async (filePath, content) => {
  try {
    await readFile(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(filePath, content, 'utf8');
  }
};

const serializeDescriptorYaml = (descriptor) => [
  `schemaVersion: ${descriptor.schemaVersion}`,
  `id: ${JSON.stringify(descriptor.id)}`,
  `provider: ${JSON.stringify(descriptor.provider)}`,
  `source: ${JSON.stringify(descriptor.source)}`,
  `label: ${JSON.stringify(descriptor.label)}`,
  `createdAt: ${JSON.stringify(descriptor.createdAt)}`,
  `updatedAt: ${JSON.stringify(descriptor.updatedAt)}`,
  '',
].join('\n');

export const initializeCatalogWorkspace = async ({ workspace, descriptor }) => {
  const paths = createCatalogWorkspacePaths(workspace);
  assertCatalogDescriptor(descriptor);
  await mkdir(paths.root, { recursive: true });
  await mkdir(paths.raw, { recursive: true });
  await mkdir(paths.generated, { recursive: true });
  await writeIfMissing(paths.descriptor, serializeDescriptorYaml(descriptor));
  await writeIfMissing(paths.items, emptyJsonl);
  await writeIfMissing(paths.classifications, emptyJsonl);
  await writeIfMissing(paths.overrides, '# Manual overrides are workspace-local.\n');
  await writeIfMissing(paths.workState, emptyJsonl);
  return paths;
};

export const parseJsonl = (text, { label = 'JSONL' } = {}) => {
  const values = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      values.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`${label} line ${index + 1} is invalid JSON: ${error.message}`);
    }
  }
  return values;
};

export const serializeJsonl = (values) => values.map((value) => JSON.stringify(value)).join('\n') + (values.length ? '\n' : '');

export const readJsonl = async (filePath, options) => parseJsonl(await readFile(filePath, 'utf8'), options);

export const writeJsonl = async (filePath, values) => {
  await writeFile(filePath, serializeJsonl(values), 'utf8');
};

export const readMediaItems = async (filePath) => {
  const items = await readJsonl(filePath, { label: 'items.jsonl' });
  items.forEach(assertMediaItem);
  return items;
};

export const writeMediaItems = async (filePath, items) => {
  items.forEach(assertMediaItem);
  await writeJsonl(filePath, items);
};
