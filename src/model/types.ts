export type ArchiveReference = string;

export type ArchiveProject = {
  id: string;
  views: string[];
  defaultTrack: ArchiveReference;
  [key: string]: unknown;
};

export type ArchiveTrack = {
  id: string;
  data: {
    order: number;
    [key: string]: unknown;
  };
};

export type ArchiveEntity = {
  id: string;
  data: Record<string, any>;
};

export type CanonicalArchivePackage = {
  project: ArchiveProject;
  tracks: ArchiveTrack[];
  acts: ArchiveEntity[];
  events: ArchiveEntity[];
  threads?: ArchiveEntity[];
  people?: ArchiveEntity[];
  sources?: ArchiveEntity[];
};
