import { assertMediaItem } from '../model/catalogPackage.mjs';

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const comparableItem = (item) => ({
  ...item,
  availability: item.availability ? { ...item.availability, observedAt: undefined } : item.availability,
  observed: item.observed ? { ...item.observed, lastCheckedAt: undefined } : item.observed,
});

export const mergeMediaItems = (existingItems, incomingItems) => {
  const byId = new Map();
  const report = { scanned: 0, added: 0, updated: 0, unchanged: 0, rejected: 0 };
  for (const item of existingItems) {
    assertMediaItem(item);
    byId.set(item.id, item);
  }
  for (const incoming of incomingItems) {
    report.scanned += 1;
    try {
      assertMediaItem(incoming);
    } catch {
      report.rejected += 1;
      continue;
    }
    const previous = byId.get(incoming.id);
    if (!previous) {
      byId.set(incoming.id, incoming);
      report.added += 1;
      continue;
    }
    const merged = {
      ...incoming,
      observed: {
        ...incoming.observed,
        firstSeenAt: previous.observed.firstSeenAt,
      },
    };
    if (sameJson(comparableItem(previous), comparableItem(merged))) report.unchanged += 1;
    else report.updated += 1;
    byId.set(incoming.id, merged);
  }
  return {
    items: [...byId.values()].sort((left, right) => left.id.localeCompare(right.id)),
    report,
  };
};
