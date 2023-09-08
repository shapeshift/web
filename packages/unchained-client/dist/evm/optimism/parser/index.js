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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionParser = exports.ZRX_OPTIMISM_PROXY_CONTRACT = void 0;
const parser_1 = require("../../parser");
const erc20 = __importStar(require("../../parser/erc20"));
const nft = __importStar(require("../../parser/nft"));
const zrx = __importStar(require("../../parser/zrx"));
exports.ZRX_OPTIMISM_PROXY_CONTRACT = '0xDEF1ABE32c034e558Cdd535791643C58a13aCC10';
class TransactionParser extends parser_1.BaseTransactionParser {
    constructor(args) {
        super(args);
        this.registerParsers([
            new nft.Parser({
                chainId: this.chainId,
                provider: this.provider,
                api: this.api,
            }),
            new erc20.Parser({ chainId: this.chainId, provider: this.provider }),
            new zrx.Parser({ proxyContract: exports.ZRX_OPTIMISM_PROXY_CONTRACT }),
        ]);
    }
}
exports.TransactionParser = TransactionParser;
