import { assertMediaItem } from '../model/catalogPackage.mjs';

const asArray = (value) => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
const normalizeText = (value) => String(value ?? '').trim().toLocaleLowerCase();
const hasValue = (values, candidate) => {
  const normalizedCandidate = normalizeText(candidate);
  return asArray(values).some((value) => normalizeText(value) === normalizedCandidate);
};
const containsValue = (values, candidate) => {
  const normalizedCandidate = normalizeText(candidate);
  return asArray(values).some((value) => normalizeText(value).includes(normalizedCandidate));
};

const classificationPeople = (classification) => (classification?.people || []).flatMap((person) => {
  if (typeof person === 'string') return [person];
  return [person?.personId, person?.id, person?.label].filter(Boolean);
});

const stateValue = (state, path) => path.reduce((value, key) => value?.[key], state);
const stateStatus = (state, path) => stateValue(state, path) ?? 'unknown';

const matchesDateRange = (publishedAt, query) => {
  if (!query.dateFrom && !query.dateTo) return true;
  if (!publishedAt) return false;
  const timestamp = Date.parse(publishedAt);
  if (Number.isNaN(timestamp)) return false;
  if (query.dateFrom && timestamp < Date.parse(`${query.dateFrom}T00:00:00.000Z`)) return false;
  if (query.dateTo && timestamp > Date.parse(`${query.dateTo}T23:59:59.999Z`)) return false;
  return true;
};

const matchesBoolean = (value, expected) => expected === undefined || Boolean(value) === expected;

const matchesQuery = ({ item, classification, workState }, query) => {
  if (query.provider && !hasValue(query.provider, item.provider)) return false;
  if (query.availability && !hasValue(query.availability, item.availability?.status)) return false;
  if (query.category && !hasValue(query.category, classification?.primaryCategory)) return false;
  if (query.series && ![classification?.series?.id, classification?.series?.label].some((value) => hasValue(query.series, value))) return false;
  if (query.game && !hasValue(query.game, classification?.game)) return false;
  if (query.format.length && !query.format.some((value) => containsValue(classification?.format, value))) return false;
  if (query.person.length && !query.person.some((value) => classificationPeople(classification).some((candidate) => containsValue(candidate, value)))) return false;
  if (!matchesDateRange(item.publishedAt, query)) return false;
  if (query.search) {
    const haystack = [item.title, item.description, item.url, classification?.series?.label, classification?.game]
      .filter(Boolean)
      .map(normalizeText)
      .join('\n');
    if (!haystack.includes(normalizeText(query.search))) return false;
  }
  if (query.audioStatus && !hasValue(query.audioStatus, stateStatus(workState, ['audio', 'status']))) return false;
  if (query.transcriptStatus && !hasValue(query.transcriptStatus, stateStatus(workState, ['transcript', 'status']))) return false;
  if (query.projectStatus && !hasValue(query.projectStatus, stateStatus(workState, ['project', 'status']))) return false;
  if (!matchesBoolean(stateValue(workState, ['publication', 'candidate']), query.publicationCandidate)) return false;
  return true;
};

const sortItems = (left, right) => {
  const leftDate = left.item.publishedAt || '';
  const rightDate = right.item.publishedAt || '';
  return rightDate.localeCompare(leftDate, 'en') || left.item.id.localeCompare(right.item.id, 'en');
};

export const normalizeCatalogQuery = (query = {}) => ({
  provider: query.provider,
  availability: query.availability,
  category: query.category || query.primaryCategory,
  series: query.series,
  game: query.game,
  format: asArray(query.format),
  person: asArray(query.person),
  dateFrom: query.dateFrom || query.date_from,
  dateTo: query.dateTo || query.date_to,
  search: query.search,
  audioStatus: query.audioStatus || query.audio_status,
  transcriptStatus: query.transcriptStatus || query.transcript_status,
  projectStatus: query.projectStatus || query.project_status,
  publicationCandidate: query.publicationCandidate ?? query.publication_candidate,
});

export const queryCatalog = ({ items, classifications = [], workState = [], query = {} }) => {
  items.forEach(assertMediaItem);
  const normalizedQuery = normalizeCatalogQuery(query);
  const classificationsByItem = new Map(classifications.map((classification) => [classification.item, classification]));
  const workStateByItem = new Map(workState.map((state) => [state.item, state]));
  const rows = items
    .map((item) => ({
      item,
      classification: classificationsByItem.get(item.id) || null,
      workState: workStateByItem.get(item.id) || null,
    }))
    .filter((row) => matchesQuery(row, normalizedQuery))
    .sort(sortItems);
  return {
    query: normalizedQuery,
    total: items.length,
    matched: rows.length,
    rows,
  };
};

export const renderCatalogQueryMarkdown = (result, { label = 'Catalog query' } = {}) => {
  const lines = [
    `# ${label}`,
    '',
    `- Matched: ${result.matched} / ${result.total}`,
    `- Query: ${JSON.stringify(result.query)}`,
    '',
    '| Date | Title | Category | Series | Audio | Transcript | Project | URL |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of result.rows) {
    const escape = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
    lines.push([
      row.item.publishedAt?.slice(0, 10) || '',
      escape(row.item.title),
      escape(row.classification?.primaryCategory),
      escape(row.classification?.series?.label),
      escape(row.workState?.audio?.status),
      escape(row.workState?.transcript?.status),
      escape(row.workState?.project?.status),
      row.item.url,
    ].join(' | '));
  }
  return `${lines.join('\n')}\n`;
};
