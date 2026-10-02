import { selectAudioAsrReceipt } from './receipt-selection.mjs';

/** Pure explicit selection. Counts must be complete; no file or completion authority. */
export const projectAudioAsrReceipt = (receipt, configuration) => selectAudioAsrReceipt(receipt, configuration);
