"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const types_1 = require("../../../types");
const parser_1 = require("../../parser");
const constants_1 = require("./constants");
class Parser {
    async parse(tx) {
        if (!(0, parser_1.txInteractsWithContract)(tx, constants_1.COWSWAP_CONTRACT_MAINNET))
            return;
        if (!(tx.tokenTransfers && tx.tokenTransfers.length))
            return;
        return await Promise.resolve({
            trade: {
                dexName: types_1.Dex.CowSwap,
                type: types_1.TradeType.Trade,
            },
            data: {
                method: undefined,
                parser: 'cowswap',
            },
        });
    }
}
exports.Parser = Parser;
