/**
 * Portable archive-domain schema factories.
 *
 * These factories deliberately accept Astro's `z` and `reference` helpers from
 * the consumer. That keeps the current content loader stable while making the
 * domain field ownership explicit for the future GOMYAKU package.
 */
type SchemaTools = {
  z: any;
  reference: (collection: string) => any;
};

export const createProjectCoreSchema = ({ z, reference }: SchemaTools) => z.object({
  schemaVersion: z.literal(1),
  sourceSetId: z.string(),
  editorialRevision: z.string(),
  slug: z.string(),
  title: z.string(),
  defaultTrack: reference('projectTracks'),
});

export const createProjectTrackSchema = ({ z, reference }: SchemaTools) => z.object({
  project: reference('projects'),
  order: z.number().int().positive(),
  kind: z.enum(['video', 'audio']),
  label: z.string(),
  shortLabel: z.string(),
  durationMs: z.number().int().positive(),
  clock: z.literal('native'),
  transcriptPolicy: z.enum(['private', 'excerpted', 'public']),
  playback: z.discriminatedUnion('provider', [
    z.object({ provider: z.literal('youtube'), videoId: z.string() }),
    z.object({ provider: z.literal('external'), url: z.string().url() }),
    z.object({ provider: z.literal('unavailable') }),
  ]),
  sourcePublishedAt: z.string().datetime({ offset: true }).optional(),
  fallbackUrl: z.string().url().optional(),
});

export const createProjectActSchema = ({ z, reference }: SchemaTools) => z.object({
  project: reference('projects'),
  track: reference('projectTracks'),
  order: z.number().int().positive(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  editorialStatus: z.enum(['draft', 'confirmed']),
  title: z.string(),
  summary: z.string(),
  sectionKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  presentationLabel: z.string().optional(),
});

export const createProjectEventSchema = ({ z, reference }: SchemaTools) => z.object({
  project: reference('projects'),
  track: reference('projectTracks'),
  act: reference('projectActs').optional(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  timingStatus: z.enum(['exact', 'approximate']),
  title: z.string(),
  summary: z.string(),
  people: z.array(reference('projectPeople')),
  personRelations: z.array(z.object({
    person: reference('projectPeople'),
    kind: z.enum(['account-context']),
  })).default([]),
  tags: z.array(z.string()),
  publicationStatus: z.enum(['verified', 'qualified', 'withheld']),
  qualification: z.string().optional(),
  readerNote: z.string().optional(),
  narrativeMode: z.enum(['threaded', 'timeline-only']).default('threaded'),
  laneAnnotations: z.array(z.object({
    lane: z.string(),
    label: z.string(),
  })).default([]),
});

export const createProjectThreadSchema = ({ z, reference }: SchemaTools) => z.object({
  project: reference('projects'),
  title: z.string(),
  category: z.enum(['running-gag', 'perfect-callback', 'cross-platform', 'making-of']),
  deck: z.string(),
  nodes: z.array(z.object({
    event: reference('projectEvents'),
    role: z.enum(['setup', 'development', 'payoff']),
    transition: z.string().optional(),
  })).min(2),
  featured: z.boolean().default(false),
  relatedSources: z.array(z.object({
    source: reference('projectSources'),
    afterEvent: reference('projectEvents'),
    context: z.string(),
  })).default([]),
});

export const createProjectPersonSchema = ({ z, reference }: SchemaTools) => z.object({
  project: reference('projects'),
  person: reference('people'),
  summary: z.string(),
  presence: z.array(z.object({
    kind: z.enum([
      'host',
      'on-site',
      'live-call',
      'live-space',
      'submitted',
      'referenced',
      'account-context',
    ]),
    track: reference('projectTracks').optional(),
    startMs: z.number().int().nonnegative().optional(),
  }).superRefine((presence: { track?: unknown; startMs?: number }, context: { addIssue: (issue: { code: 'custom'; message: string }) => void }) => {
    const hasTrack = Boolean(presence.track);
    const hasStart = presence.startMs !== undefined;
    if (hasTrack !== hasStart) {
      context.addIssue({
        code: 'custom',
        message: 'presence track and startMs must be provided together',
      });
    }
  })).min(1),
  roles: z.array(z.object({
    kind: z.enum(['cast', 'production', 'action', 'host', 'ensemble']),
    work: z.string().optional(),
    character: z.string().optional(),
    sessions: z.array(z.enum(['day', 'night'])).optional(),
    credit: z.string().optional(),
  })).default([]),
  events: z.array(reference('projectEvents')).default([]),
});

export const createProjectSourceSchema = ({ z, reference }: SchemaTools) => z.object({
  project: reference('projects'),
  kind: z.enum(['media', 'transcript', 'chat', 'editorial', 'social']),
  platform: z.enum(['x', 'web']).optional(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/).optional(),
  author: z.object({
    name: z.string(),
    handle: z.string().optional(),
  }).optional(),
  label: z.string(),
  publicUrl: z.string().url().optional(),
  note: z.string(),
});
