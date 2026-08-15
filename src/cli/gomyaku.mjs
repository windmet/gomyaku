import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileProject } from '../compiler/compileProject.mjs';
import { createYouTubeCatalogProvider } from '../catalog/providers/youtube/ytDlpProvider.mjs';
import { mergeMediaItems } from '../catalog/sync/mergeCatalog.mjs';
import { classifyCatalog } from '../catalog/classify/classifyCatalog.mjs';
import { renderCatalogStatusMarkdown, summarizeCatalog } from '../catalog/status/catalogStatus.mjs';
import { buildCatalogRows, renderCatalogMarkdown } from '../catalog/export/catalogExport.mjs';
import { queryCatalog, renderCatalogQueryMarkdown } from '../catalog/query/queryCatalog.mjs';
import { buildProjectMaterializationPlan } from '../catalog/materialize/materializeProject.mjs';
import { buildAcquisitionPlan } from '../catalog/acquire/acquisitionPlan.mjs';
import { validateWorkStateRows } from '../catalog/workstate/workState.mjs';
import {
  createCatalogWorkspacePaths,
  initializeCatalogWorkspace,
  readJsonl,
  readMediaItems,
  writeJsonl,
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
const rulesFile = readFlag('--rules');
const overridesFile = readFlag('--overrides');
const listFlag = (name) => {
  const value = readFlag(name);
  return value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : undefined;
};

const usage = () => {
  console.log('Usage:');
  console.log('  gomyaku validate|compile --input <canonical-package.json> [--out <portable-package.json>]');
  console.log('  gomyaku catalog init --provider <provider> --source <url> --workspace <path> [--label <label>]');
  console.log('  gomyaku catalog sync --provider youtube --source <url> --workspace <path> --observation-file <yt-dlp.jsonl>');
  console.log('  gomyaku catalog classify --workspace <path> [--rules <rules.yaml>] [--overrides <overrides.yaml>]');
  console.log('  gomyaku catalog status --workspace <path>');
  console.log('  gomyaku catalog validate-work-state --workspace <path> [--out <report.json>]');
  console.log('  gomyaku catalog export --workspace <path> --format markdown|json');
  console.log('  gomyaku catalog query --workspace <path> [--category <value>] [--series <value>] [--game <value>] [--format <value>] [--person <id>] [--date-from <YYYY-MM-DD>] [--date-to <YYYY-MM-DD>] [--audio-status <value>] [--transcript-status <value>] [--project-status <value>] [--publication-candidate true|false] [--search <text>] [--format-out json|markdown] [--out <path>]');
  console.log('  gomyaku project materialize --catalog-workspace <path> --item <media-id> --project-id <slug> --reason <text> [--project-title <title>] [--project-root <path>] [--snapshot-id <id>] [--out <path>]');
  console.log('  gomyaku acquire plan --workspace <path> --item <media-id>[,<media-id>] --artifact audio,chat,comments --plan-id <id> --reason <text> [--out <path>]');
};

const requireValue = (value, label) => {
  if (!value) {
    console.error(`${label} is required`);
    usage();
    process.exit(2);
  }
  return value;
};

const readCatalogDescriptor = async (descriptorPath) => {
  const descriptorText = await readFile(descriptorPath, 'utf8');
  return Object.fromEntries(descriptorText.split(/\r?\n/)
    .map((line) => line.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/))
    .filter(Boolean)
    .map((match) => {
      let value = match[2].trim();
      try { value = JSON.parse(value); } catch { /* serializer keeps unquoted scalars valid */ }
      return [match[1], value];
    }));
};

const readJsonCompatibleYaml = async (filePath, label) => {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} must be JSON-compatible YAML: ${error.message}`);
  }
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
  if (subcommand === 'classify') {
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const paths = createCatalogWorkspacePaths(selectedWorkspace);
    const items = await readMediaItems(paths.items);
    const rulesDocument = await readJsonCompatibleYaml(path.resolve(rulesFile || paths.rules), 'rules');
    const overridesDocument = await readJsonCompatibleYaml(path.resolve(overridesFile || paths.overrides), 'overrides');
    let existing = [];
    try {
      existing = await readJsonl(paths.classifications, { label: 'classifications.jsonl' });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const result = classifyCatalog({ items, rulesDocument, overridesDocument, existing });
    await writeJsonl(paths.classifications, result.classifications);
    await writeFile(
      path.join(paths.generated, 'classification-diff.json'),
      `${JSON.stringify({ report: result.report, diff: result.diff }, null, 2)}\n`,
      'utf8',
    );
    console.log(JSON.stringify(result.report, null, 2));
    return;
  }
  if (subcommand === 'status') {
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const paths = createCatalogWorkspacePaths(selectedWorkspace);
    const items = await readMediaItems(paths.items);
    const classifications = await readJsonl(paths.classifications, { label: 'classifications.jsonl' });
    const workState = await readJsonl(paths.workState, { label: 'work-state.jsonl' });
    const summary = summarizeCatalog({ items, classifications, workState });
    await writeFile(path.join(paths.generated, 'catalog-status.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    await writeFile(
      path.join(paths.generated, 'catalog-report.md'),
      renderCatalogStatusMarkdown(summary, path.basename(paths.root)),
      'utf8',
    );
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.dataQuality.valid) process.exitCode = 1;
    return;
  }
  if (subcommand === 'validate-work-state') {
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const paths = createCatalogWorkspacePaths(selectedWorkspace);
    const items = await readMediaItems(paths.items);
    const workState = await readJsonl(paths.workState, { label: 'work-state.jsonl' });
    const result = validateWorkStateRows(workState, { knownItemIds: new Set(items.map((item) => item.id)) });
    const report = {
      workspace: paths.root,
      itemCount: items.length,
      workStateCount: workState.length,
      ...result,
    };
    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (outputPath) await writeFile(path.resolve(outputPath), output, 'utf8');
    else process.stdout.write(output);
    if (!result.valid) process.exitCode = 1;
    return;
  }
  if (subcommand === 'export') {
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const format = readFlag('--format') || 'markdown';
    if (!['markdown', 'json'].includes(format)) {
      console.error(`Unsupported catalog export format: ${format}`);
      process.exit(2);
    }
    const paths = createCatalogWorkspacePaths(selectedWorkspace);
    const items = await readMediaItems(paths.items);
    const classifications = await readJsonl(paths.classifications, { label: 'classifications.jsonl' });
    const rows = buildCatalogRows(items, classifications);
    if (format === 'json') {
      await writeFile(path.join(paths.generated, 'items-view.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    } else {
      await writeFile(path.join(paths.generated, 'index.md'), renderCatalogMarkdown(rows, { label: path.basename(paths.root) }), 'utf8');
    }
    console.log(JSON.stringify({ format, rows: rows.length }, null, 2));
    return;
  }
  if (subcommand === 'query') {
    const selectedWorkspace = requireValue(workspacePath, '--workspace');
    const paths = createCatalogWorkspacePaths(selectedWorkspace);
    const items = await readMediaItems(paths.items);
    const classifications = await readJsonl(paths.classifications, { label: 'classifications.jsonl' });
    const workState = await readJsonl(paths.workState, { label: 'work-state.jsonl' });
    const publicationCandidate = readFlag('--publication-candidate');
    if (publicationCandidate !== undefined && !['true', 'false'].includes(publicationCandidate)) {
      console.error('--publication-candidate must be true or false');
      process.exit(2);
    }
    const result = queryCatalog({
      items,
      classifications,
      workState,
      query: {
        provider: listFlag('--provider'),
        availability: listFlag('--availability'),
        category: listFlag('--category'),
        series: listFlag('--series'),
        game: listFlag('--game'),
        format: listFlag('--format'),
        person: listFlag('--person'),
        dateFrom: readFlag('--date-from'),
        dateTo: readFlag('--date-to'),
        search: readFlag('--search'),
        audioStatus: listFlag('--audio-status'),
        transcriptStatus: listFlag('--transcript-status'),
        projectStatus: listFlag('--project-status'),
        publicationCandidate: publicationCandidate === undefined ? undefined : publicationCandidate === 'true',
      },
    });
    const outputFormat = readFlag('--format-out') || 'json';
    if (!['json', 'markdown'].includes(outputFormat)) {
      console.error(`Unsupported query output format: ${outputFormat}`);
      process.exit(2);
    }
    const output = outputFormat === 'markdown'
      ? renderCatalogQueryMarkdown(result, { label: path.basename(paths.root) })
      : `${JSON.stringify(result, null, 2)}\n`;
    if (outputPath) await writeFile(path.resolve(outputPath), output, 'utf8');
    else process.stdout.write(output);
    return;
  }
  usage();
  process.exit(2);
};

if (command === 'catalog') {
  await catalogCommand();
  process.exit(0);
}

if (command === 'project' && args[1] === 'materialize') {
  const selectedWorkspace = requireValue(readFlag('--catalog-workspace') || workspacePath, '--catalog-workspace');
  const selectedItemId = requireValue(readFlag('--item'), '--item');
  const selectedProjectId = requireValue(readFlag('--project-id'), '--project-id');
  const selectionReason = requireValue(readFlag('--reason'), '--reason');
  const paths = createCatalogWorkspacePaths(selectedWorkspace);
  const items = await readMediaItems(paths.items);
  const classifications = await readJsonl(paths.classifications, { label: 'classifications.jsonl' });
  const item = items.find((candidate) => candidate.id === selectedItemId);
  if (!item) throw new Error(`selected Media Item was not found: ${selectedItemId}`);
  const classification = classifications.find((candidate) => candidate.item === selectedItemId);
  const descriptor = await readCatalogDescriptor(paths.descriptor);
  const plan = buildProjectMaterializationPlan({
    catalog: descriptor,
    item,
    classification,
    projectId: selectedProjectId,
    projectTitle: readFlag('--project-title'),
    projectRoot: readFlag('--project-root'),
    selectionReason,
    snapshotId: readFlag('--snapshot-id'),
  });
  const output = `${JSON.stringify(plan, null, 2)}\n`;
  if (outputPath) await writeFile(path.resolve(outputPath), output, 'utf8');
  else process.stdout.write(output);
  process.exit(0);
}

if (command === 'acquire' && args[1] === 'plan') {
  const selectedWorkspace = requireValue(workspacePath, '--workspace');
  const selectedItemIds = listFlag('--item');
  const selectedPlanId = requireValue(readFlag('--plan-id'), '--plan-id');
  const selectionReason = requireValue(readFlag('--reason'), '--reason');
  const paths = createCatalogWorkspacePaths(selectedWorkspace);
  const items = await readMediaItems(paths.items);
  const classifications = await readJsonl(paths.classifications, { label: 'classifications.jsonl' });
  const workState = await readJsonl(paths.workState, { label: 'work-state.jsonl' });
  const descriptor = await readCatalogDescriptor(paths.descriptor);
  const plan = buildAcquisitionPlan({
    catalog: descriptor,
    items,
    classifications,
    workState,
    itemIds: selectedItemIds,
    artifacts: listFlag('--artifact') || ['audio'],
    planId: selectedPlanId,
    selectionReason,
  });
  const output = `${JSON.stringify(plan, null, 2)}\n`;
  if (outputPath) await writeFile(path.resolve(outputPath), output, 'utf8');
  else process.stdout.write(output);
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
