import { compileWorkflowEvidence, validateWorkflowEvidence, type WorkflowEvidence } from 'gomyaku/workflow';
import { verifyWorkflowFiles, type WorkflowFileReport } from 'gomyaku/workflow/files';
const input:WorkflowEvidence = {schemaVersion:1, sources:[], artifacts:[], segments:[], paths:[]};
const projected:string[] = compileWorkflowEvidence(input).index.nodes.map(node => node.id);
const valid:boolean = validateWorkflowEvidence(null).valid;
const result:Promise<WorkflowFileReport> = verifyWorkflowFiles(input, {root:'fictional-root'});
void [projected, valid, result];
// @ts-expect-error Artifact byte identity is required, rather than an inferred completion status.
const incomplete:WorkflowEvidence = {schemaVersion:1, sources:[], artifacts:[{id:'a', sourceId:'s', path:'a.txt'}], segments:[], paths:[]};
void incomplete;
