const ids = (items = []) => new Set(items.map((item) => item.id));

export const validateArchivePackage = (archive) => {
  const failures = [];
  const tracks = archive?.tracks || [];
  const acts = archive?.acts || [];
  const events = archive?.events || [];
  const threads = archive?.threads || [];
  const people = archive?.people || [];
  const sources = archive?.sources || [];
  const trackIds = ids(tracks);
  const actIds = ids(acts);
  const eventIds = ids(events);
  const personIds = ids(people);
  const sourceIds = ids(sources);

  if (!archive?.project?.id) failures.push('project.id is required');
  if (!archive?.project?.defaultTrack || !trackIds.has(archive.project.defaultTrack)) {
    failures.push('project.defaultTrack must reference a track');
  }
  if (tracks.some((track) => !track.id || !Number.isInteger(track.data?.order) || track.data.order < 1)) {
    failures.push('tracks require unique ids and positive integer order');
  }
  if (new Set(tracks.map((track) => track.id)).size !== tracks.length) failures.push('track ids must be unique');
  if (acts.some((act) => !trackIds.has(act.data?.track))) failures.push('act track reference is not closed');
  if (events.some((event) => !trackIds.has(event.data?.track))) failures.push('event track reference is not closed');
  if (events.some((event) => event.data?.act && !actIds.has(event.data.act))) failures.push('event act reference is not closed');
  if (events.some((event) => !['public', 'verified', 'qualified', 'withheld'].includes(event.data?.publicationStatus))) {
    failures.push('event publicationStatus is invalid');
  }
  if (threads.some((thread) => thread.data?.nodes?.some((node) => !eventIds.has(node.event)))) {
    failures.push('thread event reference is not closed');
  }
  if (people.some((person) => person.data?.person && !personIds.has(person.data.person))) {
    failures.push('person identity reference is not closed');
  }
  if (sources.some((source) => source.data?.source && !sourceIds.has(source.data.source))) {
    failures.push('source reference is not closed');
  }

  return { valid: failures.length === 0, failures };
};
