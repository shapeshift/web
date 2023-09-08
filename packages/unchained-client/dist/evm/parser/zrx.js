"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const types_1 = require("../../types");
const _1 = require(".");
class Parser {
    constructor(args) {
        this.proxyContract = args.proxyContract;
    }
    async parse(tx) {
        if (!(0, _1.txInteractsWithContract)(tx, this.proxyContract))
            return;
        if (!(tx.tokenTransfers && tx.tokenTransfers.length))
            return;
        return await Promise.resolve({
            trade: {
                dexName: types_1.Dex.Zrx,
                type: types_1.TradeType.Trade,
            },
            data: {
                method: undefined,
                parser: 'zrx',
            },
        });
    }
}
exports.Parser = Parser;
