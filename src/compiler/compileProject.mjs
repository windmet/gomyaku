import { validateArchivePackage } from '../validation/projectPackage.mjs';

const byId = (left, right) => left.id.localeCompare(right.id);
const clone = (value) => JSON.parse(JSON.stringify(value));

const scanPrivateValues = (value, path = '$') => {
  if (typeof value === 'string' && (/^[A-Za-z]:[\\/]/.test(value) || /^\/(?:Users|home|private|tmp)\//.test(value))) {
    return [`${path}: local filesystem path is not portable`];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => scanPrivateValues(item, `${path}[${index}]`));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    if (/raw(?:Output|Audio)|privatePath|localPath/i.test(key)) return [`${path}.${key}: private evidence field is not portable`];
    return scanPrivateValues(child, `${path}.${key}`);
  });
};

export const compileProject = (archive) => {
  const validation = validateArchivePackage(archive);
  if (!validation.valid) throw new Error(`Cannot compile archive package: ${validation.failures.join('; ')}`);
  const portable = clone({
    schemaVersion: 1,
    project: archive.project,
    tracks: archive.tracks,
    acts: archive.acts,
    events: archive.events.filter((event) => event.data?.publicationStatus !== 'withheld'),
    threads: archive.threads || [],
    people: archive.people || [],
    sources: archive.sources || [],
  });
  const privateFailures = scanPrivateValues(portable);
  if (privateFailures.length) throw new Error(`Cannot compile non-portable package: ${privateFailures.join('; ')}`);
  portable.tracks.sort((left, right) => left.data.order - right.data.order || byId(left, right));
  portable.acts.sort(byId);
  portable.events.sort(byId);
  portable.threads.sort(byId);
  portable.people.sort(byId);
  portable.sources.sort(byId);
  return portable;
};
