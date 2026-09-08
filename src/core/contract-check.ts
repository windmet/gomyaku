// Compile-time public package entrypoint check; fictional inputs only.
import { compileIndex, type IndexInput, type CompiledIndex } from 'gomyaku/core';
const input: IndexInput = { schemaVersion: 1, sources: [], nodes: [], paths: [] };
const result: CompiledIndex = compileIndex(input);
void result;
