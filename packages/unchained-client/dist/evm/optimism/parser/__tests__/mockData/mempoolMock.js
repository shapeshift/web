"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mempoolMock = void 0;
const mempoolMock = (tx, tokenTransfers = false) => {
    const mempoolSpecific = {
        blockHeight: -1,
        status: -1,
        gasUsed: undefined,
        confirmations: 0,
        fee: '0',
        blockHash: undefined,
        tokenTransfers: tokenTransfers ? tx.tokenTransfers : [],
        internalTxs: undefined,
    };
    return Object.assign({}, tx, mempoolSpecific);
};
exports.mempoolMock = mempoolMock;
