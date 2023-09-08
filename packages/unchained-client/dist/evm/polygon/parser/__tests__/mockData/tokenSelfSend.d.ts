import type { Tx } from '../../../../../generated/polygon';
export declare const tokenStandard: Tx;
declare const _default: {
    tx: Tx;
    txMempool: Tx & {
        blockHeight: number;
        status: number;
        gasUsed: undefined;
        confirmations: number;
        fee: string;
        blockHash: undefined;
        tokenTransfers: import("../../../../../generated/polygon").TokenTransfer[] | undefined;
        internalTxs: undefined;
    };
};
export default _default;
