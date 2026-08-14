type CollectionEntry = {
  id: string;
  data: any;
};

const referenceId = (reference: any) => reference?.id || reference;

export const PERSON_PRESENCE_WEIGHT = {
  host: 3,
  'on-site': 2,
  'live-call': 2,
  'live-space': 2,
  submitted: 1,
  referenced: 0.5,
  'account-context': 0.25,
} as const;

export type PersonPresenceKind = keyof typeof PERSON_PRESENCE_WEIGHT;

export const projectPersonRelevance = (presence: Array<{ kind: PersonPresenceKind }> = []) =>
  Math.max(0, ...presence.map(({ kind }) => PERSON_PRESENCE_WEIGHT[kind] || 0));

export const globalPersonRelevance = (contexts: CollectionEntry[]) => contexts.reduce(
  (total, context) => total + projectPersonRelevance(context.data.presence),
  0,
);

export type ProjectPeopleAdapter = {
  participationFromContext?: (context: any) => any[];
};

export const hydrateProjectPeople = (
  contexts: CollectionEntry[],
  identities: CollectionEntry[],
  adapter: ProjectPeopleAdapter = {},
) => {
  const identitiesById = new Map(identities.map((identity) => [identity.id, identity]));
  return contexts.map((context) => {
    const identityId = referenceId(context.data.person);
    const identity = identitiesById.get(identityId);
    if (!identity) throw new Error(`Missing global Person ${identityId} for ${context.id}`);
    const knownAs = identity.data.knownAs || [];
    return {
      ...context,
      data: {
        ...context.data,
        displayName: identity.data.displayName,
        reading: identity.data.reading,
        callNames: knownAs,
        searchAliases: identity.data.searchTokens || [],
        projectContext: context.data.summary,
        participation: adapter.participationFromContext?.(context.data) || [],
        links: identity.data.links || [],
        relevance: projectPersonRelevance(context.data.presence),
        identityId,
      },
    };
  });
};

export const projectPersonIndexEntries = (people: CollectionEntry[]) => people.map((person) => ({
  id: person.id.split('/').at(-1) || person.id,
  globalId: person.data.identityId,
  kind: projectPersonRelevance(person.data.presence) >= 1 ? 'participant' : 'person',
  label: person.data.displayName,
  aliases: [person.data.reading, ...(person.data.callNames || []), ...(person.data.searchAliases || [])].filter(Boolean),
  summary: person.data.projectContext,
  events: person.data.events || [],
  links: person.data.links || [],
  presence: person.data.presence || [],
  relevance: person.data.relevance || 0,
}));
