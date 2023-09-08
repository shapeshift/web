"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateTransfer = exports.findAsyncSequential = void 0;
const bignumber_js_1 = require("bignumber.js");
async function findAsyncSequential(array, predicate) {
    for (const element of array) {
        const result = await predicate(element);
        if (result) {
            return result;
        }
    }
    return undefined;
}
exports.findAsyncSequential = findAsyncSequential;
// keep track of all individual tx components and add up the total value transferred
function aggregateTransfer(args) {
    const { assetId, from, id, to, token, transfers, type, value } = args;
    if (!new bignumber_js_1.BigNumber(value).gt(0))
        return transfers;
    const index = transfers?.findIndex(t => t.type === type && t.assetId === assetId && t.from === from && t.to === to && t.id === id);
    const transfer = transfers?.[index];
    if (transfer) {
        transfer.totalValue = new bignumber_js_1.BigNumber(transfer.totalValue).plus(value).toString(10);
        transfer.components.push({ value });
        transfers[index] = transfer;
    }
    else {
        transfers.push({
            type,
            assetId,
            from,
            to,
            totalValue: value,
            components: [{ value }],
            token,
            id,
        });
    }
    return transfers;
}
exports.aggregateTransfer = aggregateTransfer;
