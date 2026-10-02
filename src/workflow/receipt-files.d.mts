import type { WorkflowEvidence } from './index.mjs';
import type { AudioAsrReceiptConfiguration, AudioAsrReceiptSlot } from './receipts.mjs';
import type { WorkflowFileReport } from './files.mjs';
export type ReceiptPreparation = {
  schemaVersion:1; selectionSha256:string;
  status:'prepared'|'failed'|'not-run'|'unavailable'; valid:boolean;
  observation:Omit<WorkflowFileReport, 'schemaVersion'|'manifestSha256'>;
  verification:WorkflowFileReport|null;
  configuration:AudioAsrReceiptConfiguration|null; evidence:WorkflowEvidence|null;
  supplements:{id:string; slot:AudioAsrReceiptSlot; sha256:string; byteCount:number; origin:'hash-matched-current-observation'}[];
};
/** Explicit root required for success. Structural failures reject before filesystem access. */
export function prepareAudioAsrReceipt(receipt:unknown, configuration:AudioAsrReceiptConfiguration,
  options?:{root?:string}): Promise<ReceiptPreparation>;
