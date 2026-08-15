const text = (value) => value === null || value === undefined ? '' : String(value);

export const buildCatalogRows = (items, classifications = []) => {
  const byItem = new Map(classifications.map((entry) => [entry.item, entry]));
  return [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => {
      const classification = byItem.get(item.id) || {};
      return {
        id: item.id,
        provider: item.provider,
        externalId: item.externalId,
        title: item.title,
        publishedAt: item.publishedAt || null,
        durationMs: item.durationMs ?? null,
        mediaType: item.mediaType,
        liveStatus: item.liveStatus,
        availability: item.availability?.status || 'unknown',
        primaryCategory: classification.primaryCategory || null,
        series: classification.series?.label || null,
        game: classification.game || null,
        format: (classification.format || []).join(', '),
        people: (classification.people || []).map((person) => person.personId || person.label || person).join(', '),
        url: item.url,
        classificationSource: classification.classification?.source || 'unclassified',
        reviewed: classification.classification?.reviewed === true,
      };
    });
};

const escapeMarkdown = (value) => text(value).replaceAll('|', '\\|').replaceAll('\n', ' ');

export const renderCatalogMarkdown = (rows, { label = 'Catalog', generatedAt = new Date().toISOString() } = {}) => {
  const columns = [
    ['Title', 'title'],
    ['Date', 'publishedAt'],
    ['Category', 'primaryCategory'],
    ['Series', 'series'],
    ['Game', 'game'],
    ['Format', 'format'],
    ['Availability', 'availability'],
    ['Classification', 'classificationSource'],
    ['Reviewed', 'reviewed'],
    ['URL', 'url'],
  ];
  const lines = [
    `# ${label}`,
    '',
    `Generated: ${generatedAt}`,
    `Items: ${rows.length}`,
    '',
    `| ${columns.map(([heading]) => heading).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map(([, key]) => escapeMarkdown(row[key])).join(' | ')} |`),
    '',
  ];
  return `${lines.join('\n')}\n`;
};
