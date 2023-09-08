"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTxStatus = exports.txInteractsWithContract = exports.getSigHash = void 0;
const types_1 = require("../../types");
const getSigHash = (inputData) => {
    if (!inputData)
        return;
    const length = inputData.startsWith('0x') ? 10 : 8;
    return inputData.slice(0, length);
};
exports.getSigHash = getSigHash;
const txInteractsWithContract = (tx, contract) => {
    return tx.to === contract;
};
exports.txInteractsWithContract = txInteractsWithContract;
const getTxStatus = (tx) => {
    const status = tx.status;
    if (status === -1 && tx.confirmations <= 0)
        return types_1.TxStatus.Pending;
    if (status === 1 && tx.confirmations > 0)
        return types_1.TxStatus.Confirmed;
    if (status === 0)
        return types_1.TxStatus.Failed;
    return types_1.TxStatus.Unknown;
};
exports.getTxStatus = getTxStatus;
