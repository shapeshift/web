import type { Tx } from '../../../index';
export declare const mempoolMock: (tx: Tx, tokenTransfers?: boolean) => Tx & {
    blockHeight: number;
    status: number;
    gasUsed: undefined;
    confirmations: number;
    fee: string;
    blockHash: undefined;
    tokenTransfers: import("../../../index").TokenTransfer[] | undefined;
    internalTxs: undefined;
};
