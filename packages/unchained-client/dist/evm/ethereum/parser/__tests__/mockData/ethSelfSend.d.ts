import type { Tx } from '../../../../../generated/ethereum';
declare const _default: {
    tx: Tx;
    txMempool: Tx & {
        blockHeight: number;
        status: number;
        gasUsed: undefined;
        confirmations: number;
        fee: string;
        blockHash: undefined;
        tokenTransfers: import("../../../../../generated/ethereum").TokenTransfer[] | undefined;
        internalTxs: undefined;
    };
};
export default _default;
