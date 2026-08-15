import { validateClassification } from '../classify/classifyCatalog.mjs';
import { validateMediaItem } from '../model/catalogPackage.mjs';

const increment = (record, key) => {
  const label = key ?? 'unclassified';
  record[label] = (record[label] || 0) + 1;
};

const absoluteLocalPath = /^[A-Za-z]:[\\/]|^\\\\/;
const findLocalPaths = (value, location = '$', failures = []) => {
  if (typeof value === 'string' && absoluteLocalPath.test(value)) failures.push(`${location} contains local path`);
  else if (Array.isArray(value)) value.forEach((entry, index) => findLocalPaths(entry, `${location}[${index}]`, failures));
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => findLocalPaths(entry, `${location}.${key}`, failures));
  }
  return failures;
};

export const validateCatalogData = ({ items, classifications = [], workState = [] }) => {
  const failures = [];
  const itemIds = new Set();
  for (const item of items) {
    const result = validateMediaItem(item);
    result.failures.forEach((failure) => failures.push(`${item?.id || 'unknown item'}: ${failure}`));
    if (itemIds.has(item.id)) failures.push(`duplicate Media Item id: ${item.id}`);
    itemIds.add(item.id);
  }
  const classificationIds = new Set();
  for (const classification of classifications) {
    const result = validateClassification(classification, itemIds);
    result.failures.forEach((failure) => failures.push(`${classification?.item || 'unknown classification'}: ${failure}`));
    if (classificationIds.has(classification.item)) failures.push(`duplicate Classification item: ${classification.item}`);
    classificationIds.add(classification.item);
  }
  for (const state of workState) {
    if (!itemIds.has(state.item)) failures.push(`Work State references unknown item: ${state.item}`);
  }
  findLocalPaths(items, '$.items', failures);
  findLocalPaths(classifications, '$.classifications', failures);
  return { valid: failures.length === 0, failures };
};

export const summarizeCatalog = ({ items, classifications = [], workState = [] }) => {
  const availability = {};
  const mediaTypes = {};
  const primaryCategories = {};
  const series = new Set();
  const games = new Set();
  const classification = { classified: 0, unclassified: 0, conflict: 0, overridden: 0 };
  let metadataComplete = 0;
  for (const item of items) {
    increment(availability, item.availability?.status);
    increment(mediaTypes, item.mediaType);
    if (item.publishedAt && Number.isInteger(item.durationMs) && item.source?.channelId) metadataComplete += 1;
  }
  for (const entry of classifications) {
    increment(primaryCategories, entry.primaryCategory);
    if (entry.series?.id) series.add(entry.series.id);
    if (entry.game) games.add(entry.game);
    const source = entry.classification?.source;
    if (source === 'unclassified') classification.unclassified += 1;
    else classification.classified += 1;
    if (source === 'conflict') classification.conflict += 1;
    if (source === 'override') classification.overridden += 1;
  }
  return {
    itemCount: items.length,
    metadataComplete,
    availability,
    mediaTypes,
    classification,
    primaryCategories,
    distinctSeries: series.size,
    distinctGames: games.size,
    workStateCount: workState.length,
    dataQuality: validateCatalogData({ items, classifications, workState }),
  };
};

export const renderCatalogStatusMarkdown = (summary, label = 'Catalog') => {
  const lines = [
    `# ${label} status`,
    '',
    `- Items: ${summary.itemCount}`,
    `- Metadata complete: ${summary.metadataComplete}`,
    `- Classified: ${summary.classification.classified}`,
    `- Unclassified: ${summary.classification.unclassified}`,
    `- Conflicts: ${summary.classification.conflict}`,
    `- Reviewed overrides: ${summary.classification.overridden}`,
    `- Distinct series: ${summary.distinctSeries}`,
    `- Distinct games: ${summary.distinctGames}`,
    `- Data quality: ${summary.dataQuality.valid ? 'PASS' : 'FAIL'}`,
    '',
    '## Primary categories',
    '',
    ...Object.entries(summary.primaryCategories).sort().map(([key, count]) => `- ${key}: ${count}`),
    '',
  ];
  if (!summary.dataQuality.valid) {
    lines.push('## Data quality failures', '', ...summary.dataQuality.failures.map((failure) => `- ${failure}`), '');
  }
  return `${lines.join('\n')}\n`;
};
