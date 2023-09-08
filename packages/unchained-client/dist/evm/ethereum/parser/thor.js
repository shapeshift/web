"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const ethers_1 = require("ethers");
const types_1 = require("../../../types");
const parser_1 = require("../../parser");
const thorAvalanche_1 = require("./abi/thorAvalanche");
const thorEthereum_1 = require("./abi/thorEthereum");
const constants_1 = require("./constants");
const SWAP_TYPES = ['SWAP', '=', 's'];
class Parser {
    constructor(args) {
        this.abiInterface = (() => {
            switch (args.chainId) {
                case caip_1.ethChainId:
                    return new ethers_1.ethers.utils.Interface(thorEthereum_1.THOR_ETHEREUM_ABI);
                case caip_1.avalancheChainId:
                    return new ethers_1.ethers.utils.Interface(thorAvalanche_1.THOR_AVALANCHE_ABI);
                default:
                    throw new Error(`chainId is not supported. (supported chainIds: ${caip_1.ethChainId}, ${caip_1.avalancheChainId})`);
            }
        })();
        this.supportedFunctions = {
            depositSigHash: this.abiInterface.getSighash('deposit'),
            transferOutSigHash: this.abiInterface.getSighash('transferOut'),
        };
        // TODO: Router contract can change, use /inbound_addresses endpoint to determine current router contract.
        // We will also need to know all past router contract addresses if we intend on using receive address as the means for detection
        this.routerContract = (() => {
            switch (args.chainId) {
                case caip_1.ethChainId:
                    return constants_1.THOR_ROUTER_CONTRACT_ETH_MAINNET;
                case caip_1.avalancheChainId:
                    return constants_1.THOR_ROUTER_CONTRACT_AVAX_MAINNET;
                default:
                    throw new Error(`chainId is not supported. (supported chainIds: ${caip_1.ethChainId}, ${caip_1.avalancheChainId})`);
            }
        })();
    }
    async parse(tx) {
        if (!(0, parser_1.txInteractsWithContract)(tx, this.routerContract))
            return;
        if (!tx.inputData)
            return;
        const txSigHash = (0, parser_1.getSigHash)(tx.inputData);
        if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash))
            return;
        const decoded = this.abiInterface.parseTransaction({ data: tx.inputData });
        // failed to decode input data
        if (!decoded)
            return;
        const data = {
            method: decoded.name,
            parser: 'thor',
        };
        const [type] = decoded.args.memo.split(':');
        if (SWAP_TYPES.includes(type) || type === 'OUT') {
            return await Promise.resolve({
                trade: { dexName: types_1.Dex.Thor, type: types_1.TradeType.Trade, memo: decoded.args.memo },
                data,
            });
        }
        if (type === 'REFUND') {
            return await Promise.resolve({
                trade: { dexName: types_1.Dex.Thor, type: types_1.TradeType.Refund, memo: decoded.args.memo },
                data,
            });
        }
        // memo type not supported
        return;
    }
}
exports.Parser = Parser;
