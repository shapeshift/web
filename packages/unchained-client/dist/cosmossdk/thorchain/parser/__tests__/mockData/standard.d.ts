import type { Tx } from '../../../../types';
declare const _default: {
    tx: Tx;
    txWithFee: {
        fee: {
            amount: string;
            denom: string;
        };
        blockHash?: string | undefined;
        blockHeight: number;
        timestamp: number;
        txid: string;
        confirmations: number;
        events: {
            [key: string]: {
                [key: string]: {
                    [key: string]: string;
                };
            };
        };
        gasUsed: string;
        gasWanted: string;
        index: number;
        memo?: string | undefined;
        messages: import("../../../../types").Message[];
        value: string;
    };
    txNoFee: Tx;
};
export default _default;
