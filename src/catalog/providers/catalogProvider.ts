import type { CatalogDescriptor, MediaItem } from '../model/catalogTypes.js';

export interface CatalogProvider {
  provider: string;
  discover(input: { source: CatalogDescriptor['source']; tab?: string }): Promise<MediaItem[]>;
}
