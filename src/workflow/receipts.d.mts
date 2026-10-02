import type { WorkflowEvidence } from './index.mjs';
export type AudioAsrReceiptSlot =
  | '/sourceMedia/path' | '/m4a/masterPath' | '/whisper/deliverySrt'
  | '/chat/rawPath' | '/chat/normalizedPath' | '/comments/infoPath' | '/comments/normalizedPath'
  | `/m4aChunks/${number}/path` | `/whisper/rawChunkOutputs/${number}/srt`;
export type ReceiptBinding = {
  slot:AudioAsrReceiptSlot; id:string; sourceId:string;
  /** Required when the selected receipt slot has no byte count. Never overrides a declared count. */
  byteCount?:number; parents?:string[];
};
export type AudioAsrReceiptConfiguration = {
  schemaVersion:1; sources:WorkflowEvidence['sources']; bindings:ReceiptBinding[];
  segments:WorkflowEvidence['segments']; paths:WorkflowEvidence['paths'];
};
export function projectAudioAsrReceipt(receipt:unknown, configuration:AudioAsrReceiptConfiguration): WorkflowEvidence;
