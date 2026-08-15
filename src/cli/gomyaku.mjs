import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileProject } from '../compiler/compileProject.mjs';
import { createYouTubeCatalogProvider } from '../catalog/providers/youtube/ytDlpProvider.mjs';
import { mergeMediaItems } from '../catalog/sync/mergeCatalog.mjs';
import {
  createCatalogWorkspacePaths,
  initializeCatalogWorkspace,
  readMediaItems,
  writeMediaItems,
} from '../catalog/workspace/catalogWorkspace.mjs';
import { validateArchivePackage } from '../validation/projectPackage.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';
const readFlag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const inputPath = readFlag('--input');
const outputPath = readFlag('--out');
const workspacePath = readFlag('--workspace');
const source = readFlag('--source');
const provider = readFlag('--provider');
const observationFile = readFlag('--observation-file');

const usage = () => {
  console.log('Usage:');
  console.log('  gomyaku validate|compile --input <canonical-package.json> [--out <portable-package.json>]');
  console.log('  gomyaku catalog init --provider <provider> --source <url> --workspace <path> [--label <label>]');
  console.log('  gomyaku catalog sync --provider youtube --source <url> --workspace <path> --observation-file <yt-dlp.jsonl>');
};

const requireValue = (value, label) => {
  if (!value) {
    console.error(`${label} is required`);
    usage();
    process.exit(2);
  }
  return value;
};

const catalogCommand = async () => {
  const subcommand = args[1];
  if (subcommand === 'init') {
    const selectedProvider = requireValue(provider, '--provider');
    const selectedSource = requireValue(source, '--source');
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const now = new Date().toISOString();
    const id = readFlag('--id') || `${selectedProvider}-${selectedSource.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
    const descriptor = {
      schemaVersion: 1,
      id,
      provider: selectedProvider,
      source: selectedSource,
      label: readFlag('--label') || id,
      createdAt: now,
      updatedAt: now,
    };
    const paths = await initializeCatalogWorkspace({ workspace: selectedWorkspace, descriptor });
    console.log(`Catalog workspace initialized: ${paths.root}`);
    return;
  }
  if (subcommand === 'sync') {
    const selectedProvider = requireValue(provider, '--provider');
    const selectedSource = requireValue(source, '--source');
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const selectedObservationFile = requireValue(observationFile, '--observation-file');
    if (selectedProvider !== 'youtube') {
      console.error(`Unsupported sync provider: ${selectedProvider}`);
      process.exit(2);
    }
    const paths = createCatalogWorkspacePaths(selectedWorkspace);
    const output = await readFile(path.resolve(selectedObservationFile), 'utf8');
    const syncNow = new Date().toISOString();
    const youtube = createYouTubeCatalogProvider({ run: async () => output, now: () => syncNow });
    const incoming = await youtube.discover({ source: selectedSource, tab: readFlag('--tab') || 'streams' });
    let existing = [];
    try {
      existing = await readMediaItems(paths.items);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const merged = mergeMediaItems(existing, incoming);
    await writeMediaItems(paths.items, merged.items);
    console.log(JSON.stringify({ ...merged.report, itemCount: merged.items.length }, null, 2));
    return;
  }
  usage();
  process.exit(2);
};

if (command === 'catalog') {
  await catalogCommand();
  process.exit(0);
}

if (!inputPath && command !== 'help') {
  usage();
  process.exit(2);
}

if (command === 'help') {
  usage();
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
