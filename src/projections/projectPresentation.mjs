export const deriveProjectCapabilities = ({ project, tracks, acts, events, threads }) => {
  const views = [...project.views];
  const orderedTracks = [...tracks].sort((left, right) => left.data.order - right.data.order);
  const hasMultipleTracks = orderedTracks.length > 1;
  const publicEventCount = events.filter((event) => event.data.publicationStatus !== 'withheld').length;
  const defaultTrackId = project.defaultTrack?.id || project.defaultTrack;
  const defaultTrack = orderedTracks.find((track) => track.id === defaultTrackId) || orderedTracks[0];
  const defaultTrackActs = acts.filter((act) => (act.data.track?.id || act.data.track) === defaultTrack?.id);

  return {
    views,
    orderedTracks,
    hasMultipleTracks,
    showMediaSources: hasMultipleTracks,
    showTimelineScope: hasMultipleTracks,
    showPlayerSourceTabs: hasMultipleTracks,
    showOverview: views.includes('overview'),
    showSections: views.includes('sections'),
    showTimeline: views.includes('timeline'),
    showMentions: views.includes('mentions'),
    showStorylines: views.includes('storylines'),
    showPeople: views.includes('people'),
    showTranscript: views.includes('transcript'),
    counts: {
      durationMs: defaultTrack?.data.durationMs || 0,
      trackCount: orderedTracks.length,
      sectionCount: defaultTrackActs.length,
      publicEventCount,
      threadCount: threads.length,
    },
  };
};
