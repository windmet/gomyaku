export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Source = { id: string; durationMs?: number; data?: Json };
export type Anchor = { sourceId: string; startMs: number; endMs?: number };
export type Node = { id: string; references: string[]; anchors: Anchor[]; data?: Json };
export type OrderedPath = { id: string; nodeIds: string[]; data?: Json };
export type IndexInput = { schemaVersion: 1; sources: Source[]; nodes: Node[]; paths: OrderedPath[] };
export type CompiledIndex = IndexInput & {
  reverseReferences: { nodeId: string; from: string[] }[];
  pathMembership: { nodeId: string; paths: string[] }[];
  timelines: { sourceId: string; anchors: { nodeId: string; startMs: number; endMs?: number }[] }[];
};
export function validateIndex(input: unknown): { valid: boolean; failures: { path: string; message: string }[] };
export function compileIndex(input: IndexInput): CompiledIndex;
export function serializeIndex(input: IndexInput): string;
