"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTransactionParser = void 0;
const bignumber_js_1 = require("bignumber.js");
const types_1 = require("../../types");
const utils_1 = require("../../utils");
const utils_2 = require("./utils");
__exportStar(require("./types"), exports);
class BaseTransactionParser {
    constructor(args) {
        this.chainId = args.chainId;
        this.assetId = args.assetId;
    }
    parse(tx, address) {
        const parsedTx = {
            address,
            blockHash: tx.blockHash,
            blockHeight: tx.blockHeight ?? -1,
            blockTime: tx.timestamp ?? Math.floor(Date.now() / 1000),
            chainId: this.chainId,
            confirmations: tx.confirmations,
            status: this.getStatus(tx),
            transfers: [],
            txid: tx.txid,
        };
        tx.messages.forEach((msg, i) => {
            const { from, to, value, origin } = msg;
            // We use origin for fees because some txs have a different from and origin addresses
            if (origin === address) {
                // network fee
                const fees = new bignumber_js_1.BigNumber(tx.fee.amount);
                if (fees.gt(0)) {
                    parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) };
                }
            }
            const assetId = (0, utils_2.getAssetIdByDenom)(value?.denom, this.assetId);
            if (!assetId)
                return;
            if (i === 0)
                parsedTx.data = (0, utils_2.metaData)(msg, tx.events[msg.index], assetId);
            const amount = new bignumber_js_1.BigNumber(value?.amount ?? 0);
            if (from === address && amount.gt(0)) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)({
                    assetId,
                    from,
                    to,
                    transfers: parsedTx.transfers,
                    type: types_1.TransferType.Send,
                    value: amount.toString(10),
                });
            }
            if (to === address && amount.gt(0)) {
                parsedTx.transfers = (0, utils_1.aggregateTransfer)({
                    assetId,
                    from,
                    to,
                    transfers: parsedTx.transfers,
                    type: types_1.TransferType.Receive,
                    value: amount.toString(10),
                });
            }
        });
        return Promise.resolve(parsedTx);
    }
    getStatus(tx) {
        if (tx.events['0']?.error)
            return types_1.TxStatus.Failed;
        if (tx.confirmations <= 0)
            return types_1.TxStatus.Pending;
        if (tx.confirmations > 0)
            return types_1.TxStatus.Confirmed;
        return types_1.TxStatus.Unknown;
    }
}
exports.BaseTransactionParser = BaseTransactionParser;
