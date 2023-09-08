import type { Tx } from '../../../../../generated/optimism';
export declare const mempoolMock: (tx: Tx, tokenTransfers?: boolean) => Tx & {
    blockHeight: number;
    status: number;
    gasUsed: undefined;
    confirmations: number;
    fee: string;
    blockHash: undefined;
    tokenTransfers: import("../../../../../generated/optimism").TokenTransfer[] | undefined;
    internalTxs: undefined;
};
