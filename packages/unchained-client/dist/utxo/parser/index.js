"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTransactionParser = void 0;
const bignumber_js_1 = require("bignumber.js");
const types_1 = require("../../types");
const utils_1 = require("../../utils");
class BaseTransactionParser {
    constructor(args) {
        this.chainId = args.chainId;
        this.assetId = args.assetId;
    }
    parse(tx, address) {
        const parsedTx = {
            address,
            blockHash: tx.blockHash,
            blockHeight: tx.blockHeight,
            blockTime: tx.timestamp,
            chainId: this.chainId,
            confirmations: tx.confirmations,
            status: tx.confirmations > 0 ? types_1.TxStatus.Confirmed : types_1.TxStatus.Pending,
            transfers: [],
            txid: tx.txid,
        };
        tx.vin.forEach(vin => {
            if (vin.addresses?.includes(address)) {
                // send amount
                const sendValue = new bignumber_js_1.BigNumber(vin.value ?? 0);
                if (sendValue.gt(0)) {
                    parsedTx.transfers = (0, utils_1.aggregateTransfer)({
                        assetId: this.assetId,
                        from: vin.addresses?.[0] ?? '',
                        to: tx.vout[0].addresses?.[0] ?? '',
                        transfers: parsedTx.transfers,
                        type: types_1.TransferType.Send,
                        value: sendValue.toString(10),
                    });
                }
                // network fee
                const fees = new bignumber_js_1.BigNumber(tx.fee ?? 0);
                if (fees.gt(0)) {
                    parsedTx.fee = { assetId: this.assetId, value: fees.toString(10) };
                }
            }
        });
        tx.vout.forEach(vout => {
            if (vout.addresses?.includes(address)) {
                // receive amount
                const receiveValue = new bignumber_js_1.BigNumber(vout.value ?? 0);
                if (receiveValue.gt(0)) {
                    parsedTx.transfers = (0, utils_1.aggregateTransfer)({
                        assetId: this.assetId,
                        from: tx.vin[0].addresses?.[0] ?? '',
                        to: vout.addresses?.[0] ?? '',
                        transfers: parsedTx.transfers,
                        type: types_1.TransferType.Receive,
                        value: receiveValue.toString(10),
                    });
                }
            }
        });
        return Promise.resolve(parsedTx);
    }
}
exports.BaseTransactionParser = BaseTransactionParser;
