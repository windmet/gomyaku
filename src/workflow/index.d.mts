import type { CompiledIndex, Source, OrderedPath } from '../core/index.mjs';
export type Artifact = { id:string; sourceId:string; path:string; sha256:string; byteCount:number; parents?:string[] };
export type Segment = { id:string; artifactId:string; startMs:number; endMs?:number };
export type WorkflowEvidence = {
  schemaVersion:1;
  sources:Pick<Source, 'id' | 'durationMs'>[];
  artifacts:Artifact[];
  segments:Segment[];
  paths:Pick<OrderedPath, 'id' | 'nodeIds'>[];
};
export type CompiledWorkflowEvidence = {schemaVersion:1; index:CompiledIndex; artifacts:(Artifact & {parents:string[]})[]};
export function validateWorkflowEvidence(input:unknown): {valid:boolean; failures:{path:string; message:string}[]};
export function compileWorkflowEvidence(input:WorkflowEvidence): CompiledWorkflowEvidence;
export function serializeWorkflowEvidence(input:WorkflowEvidence): string;
