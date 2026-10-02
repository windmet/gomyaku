import type { WorkflowEvidence } from './index.mjs';
export type FileVerification = {id:string; path:string; status:'failed'|'verified'; actual?:{sha256:string; byteCount:number}; failures:string[]};
export type WorkflowFileReport = {schemaVersion:1; manifestSha256:string; status:'not-run'|'unavailable'|'checked'; valid:boolean; checked:number; files:FileVerification[]; failures:string[]};
export function verifyWorkflowFiles(input:WorkflowEvidence, options?:{root?:string}): Promise<WorkflowFileReport>;
