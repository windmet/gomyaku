import {
  assertMediaItem,
  classifyCatalog,
  buildYtDlpDiscoveryArgs,
  compileProject,
  createYouTubeCatalogProvider,
  deriveProjectCapabilities,
  mergeMediaItems,
  normalizeMediaItem,
  normalizeYouTubeObservation,
  parseYtDlpJsonLines,
  summarizeCatalog,
  validateCatalogData,
  buildCatalogRows,
  renderCatalogMarkdown,
  validateArchivePackage,
  verifySourceSet,
} from '../src/index.mjs';

for (const [name, value] of Object.entries({
  compileProject,
  deriveProjectCapabilities,
  validateArchivePackage,
  verifySourceSet,
  assertMediaItem,
  classifyCatalog,
  buildYtDlpDiscoveryArgs,
  createYouTubeCatalogProvider,
  mergeMediaItems,
  normalizeMediaItem,
  normalizeYouTubeObservation,
  parseYtDlpJsonLines,
  summarizeCatalog,
  validateCatalogData,
  buildCatalogRows,
  renderCatalogMarkdown,
})) {
  if (typeof value !== 'function') throw new Error(`GOMYAKU package surface missing ${name}`);
}

console.log('GOMYAKU package surface verified (runtime exports are explicit).');
