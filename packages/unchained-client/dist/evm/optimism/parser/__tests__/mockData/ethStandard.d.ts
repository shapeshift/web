import type { Tx } from '../../../../../generated/optimism';
declare const _default: {
    tx: Tx;
    txMempool: Tx & {
        blockHeight: number;
        status: number;
        gasUsed: undefined;
        confirmations: number;
        fee: string;
        blockHash: undefined;
        tokenTransfers: import("../../../../../generated/optimism").TokenTransfer[] | undefined;
        internalTxs: undefined;
    };
};
export default _default;
