import { assertMediaItem } from '../model/catalogPackage.mjs';

const scalarFields = new Set(['primaryCategory', 'series', 'game']);
const additiveFields = new Set(['format', 'people', 'topics', 'tags']);
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const asArray = (value) => Array.isArray(value) ? value : value === undefined ? [] : [value];
const uniqueJson = (values) => [...new Map(values.map((value) => [JSON.stringify(value), value])).values()];

const matchesText = (text, candidates) => {
  const normalized = text.toLocaleLowerCase();
  return asArray(candidates).some((candidate) => normalized.includes(String(candidate).toLocaleLowerCase()));
};

export const matchesClassificationRule = (item, rule) => {
  const when = rule.when || {};
  if (when.provider && !asArray(when.provider).includes(item.provider)) return false;
  if (when.mediaType && !asArray(when.mediaType).includes(item.mediaType)) return false;
  if (when.titleContains && !matchesText(item.title, when.titleContains)) return false;
  if (when.titleRegex) {
    let matched = false;
    for (const pattern of asArray(when.titleRegex)) {
      try {
        if (new RegExp(pattern, 'iu').test(item.title)) matched = true;
      } catch (error) {
        throw new Error(`classification rule ${rule.id} has invalid titleRegex ${pattern}: ${error.message}`);
      }
    }
    if (!matched) return false;
  }
  return Object.keys(when).length > 0;
};

export const validateClassification = (classification, itemIds) => {
  const failures = [];
  if (!classification || typeof classification !== 'object') return { valid: false, failures: ['classification must be an object'] };
  if (classification.schemaVersion !== 1) failures.push('schemaVersion must be 1');
  if (!itemIds.has(classification.item)) failures.push(`classification references unknown item: ${classification.item}`);
  if (!['rule', 'override', 'unclassified', 'conflict'].includes(classification.classification?.source)) {
    failures.push('classification.source is invalid');
  }
  for (const field of additiveFields) {
    if (!Array.isArray(classification[field])) failures.push(`${field} must be an array`);
  }
  return { valid: failures.length === 0, failures };
};

const assertRulesDocument = (document) => {
  if (!document || document.schemaVersion !== 1 || !Array.isArray(document.rules)) {
    throw new Error('rules document must have schemaVersion 1 and a rules array');
  }
  const identifiers = new Set();
  for (const rule of document.rules) {
    if (!rule.id || identifiers.has(rule.id)) throw new Error(`classification rule id is missing or duplicated: ${rule.id}`);
    identifiers.add(rule.id);
    if (!Number.isFinite(rule.priority)) throw new Error(`classification rule ${rule.id} requires numeric priority`);
    for (const key of Object.keys(rule.set || {})) {
      if (!scalarFields.has(key)) throw new Error(`classification rule ${rule.id} cannot set unsupported scalar ${key}`);
    }
    for (const key of Object.keys(rule.add || {})) {
      if (!additiveFields.has(key)) throw new Error(`classification rule ${rule.id} cannot add unsupported field ${key}`);
    }
  }
};

const baseClassification = (item) => ({
  schemaVersion: 1,
  item: item.id,
  primaryCategory: null,
  series: null,
  game: null,
  format: [],
  people: [],
  topics: [],
  tags: [],
  classification: {
    source: 'unclassified',
    ruleIds: [],
    reviewed: false,
    conflicts: [],
  },
});

const classifyItem = (item, rules, override) => {
  const output = baseClassification(item);
  const assignments = new Map();
  const matched = [...rules]
    .filter((rule) => matchesClassificationRule(item, rule))
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  for (const rule of matched) {
    output.classification.ruleIds.push(rule.id);
    for (const [field, value] of Object.entries(rule.set || {})) {
      const previous = assignments.get(field);
      if (!previous) {
        assignments.set(field, { priority: rule.priority, value, ruleId: rule.id });
        output[field] = value;
      } else if (previous.priority === rule.priority && !sameJson(previous.value, value)) {
        output.classification.conflicts.push({
          field,
          priority: rule.priority,
          candidates: [
            { ruleId: previous.ruleId, value: previous.value },
            { ruleId: rule.id, value },
          ],
        });
      }
    }
    for (const [field, values] of Object.entries(rule.add || {})) {
      output[field] = uniqueJson([...output[field], ...asArray(values)]);
    }
  }
  if (matched.length) output.classification.source = output.classification.conflicts.length ? 'conflict' : 'rule';
  if (override) {
    for (const field of scalarFields) {
      if (Object.hasOwn(override, field)) output[field] = override[field];
    }
    for (const field of additiveFields) {
      if (Object.hasOwn(override, field)) output[field] = uniqueJson(asArray(override[field]));
    }
    output.classification = {
      ...output.classification,
      source: 'override',
      reviewed: true,
      overrideReason: override.reason || null,
      conflicts: [],
    };
  }
  return output;
};

export const classifyCatalog = ({ items, rulesDocument, overridesDocument, existing = [] }) => {
  items.forEach(assertMediaItem);
  assertRulesDocument(rulesDocument);
  const itemIds = new Set(items.map((item) => item.id));
  if (itemIds.size !== items.length) throw new Error('catalog items contain duplicate ids');
  if (!overridesDocument || overridesDocument.schemaVersion !== 1 || typeof overridesDocument.overrides !== 'object') {
    throw new Error('overrides document must have schemaVersion 1 and an overrides object');
  }
  const overrides = overridesDocument.overrides;
  for (const itemId of Object.keys(overrides)) {
    if (!itemIds.has(itemId)) throw new Error(`override references unknown item: ${itemId}`);
    if (typeof overrides[itemId]?.reason !== 'string' || !overrides[itemId].reason.trim()) {
      throw new Error(`override requires a non-empty reason: ${itemId}`);
    }
  }
  const previous = new Map(existing.map((classification) => [classification.item, classification]));
  const classifications = [...items]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((item) => classifyItem(item, rulesDocument.rules, overrides[item.id]));
  for (const classification of classifications) {
    const result = validateClassification(classification, itemIds);
    if (!result.valid) throw new Error(result.failures.join('; '));
  }
  const report = { items: classifications.length, new: 0, changed: 0, unchanged: 0, conflict: 0, unclassified: 0, overridden: 0 };
  const diff = [];
  for (const classification of classifications) {
    const old = previous.get(classification.item);
    const status = !old ? 'NEW' : sameJson(old, classification) ? 'UNCHANGED' : 'CHANGED';
    report[status.toLowerCase()] += 1;
    if (status !== 'UNCHANGED') diff.push({ item: classification.item, status, before: old || null, after: classification });
    if (classification.classification.source === 'conflict') report.conflict += 1;
    if (classification.classification.source === 'unclassified') report.unclassified += 1;
    if (classification.classification.source === 'override') report.overridden += 1;
  }
  return { classifications, report, diff };
};
