import {
  compileProject,
  deriveProjectCapabilities,
  validateArchivePackage,
  verifySourceSet,
} from '../src/index.mjs';

for (const [name, value] of Object.entries({
  compileProject,
  deriveProjectCapabilities,
  validateArchivePackage,
  verifySourceSet,
})) {
  if (typeof value !== 'function') throw new Error(`GOMYAKU package surface missing ${name}`);
}

console.log('GOMYAKU package surface verified (runtime exports are explicit).');
