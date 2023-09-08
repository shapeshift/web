import { TxStatus } from '../../types';
import type { Tx } from './types';
export declare const getSigHash: (inputData: string | undefined) => string | undefined;
export declare const txInteractsWithContract: (tx: {
    to: string;
}, contract: string) => boolean;
export declare const getTxStatus: (tx: Tx) => TxStatus;
