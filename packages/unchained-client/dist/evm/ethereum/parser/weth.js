"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const ethers_1 = require("ethers");
const types_1 = require("../../../types");
const parser_1 = require("../../parser");
const weth_1 = require("./abi/weth");
const constants_1 = require("./constants");
class Parser {
    constructor(args) {
        this.abiInterface = new ethers_1.ethers.utils.Interface(weth_1.WETH_ABI);
        this.supportedFunctions = {
            depositSigHash: this.abiInterface.getSighash('deposit'),
            withdrawalSigHash: this.abiInterface.getSighash('withdraw'),
        };
        this.chainId = args.chainId;
        this.provider = args.provider;
        this.wethContract = (() => {
            switch (args.chainId) {
                case 'eip155:1':
                    return constants_1.WETH_CONTRACT_MAINNET;
                case 'eip155:3':
                    return constants_1.WETH_CONTRACT_ROPSTEN;
                default:
                    throw new Error('chainId is not supported. (supported chainIds: eip155:1, eip155:3)');
            }
        })();
    }
    async parse(tx) {
        if (!(0, parser_1.txInteractsWithContract)(tx, this.wethContract))
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
        const assetId = (0, caip_1.toAssetId)({
            ...(0, caip_1.fromChainId)(this.chainId),
            assetNamespace: 'erc20',
            assetReference: this.wethContract,
        });
        const token = {
            contract: this.wethContract,
            decimals: 18,
            name: 'Wrapped Ether',
            symbol: 'WETH',
        };
        const transfers = (() => {
            switch (txSigHash) {
                case this.supportedFunctions.depositSigHash: {
                    return [
                        {
                            type: types_1.TransferType.Receive,
                            from: this.wethContract,
                            to: tx.from,
                            assetId,
                            totalValue: tx.value,
                            components: [{ value: tx.value }],
                            token,
                        },
                    ];
                }
                case this.supportedFunctions.withdrawalSigHash:
                    return [
                        {
                            type: types_1.TransferType.Send,
                            from: tx.from,
                            to: this.wethContract,
                            assetId,
                            totalValue: decoded.args.wad.toString(),
                            components: [{ value: decoded.args.wad.toString() }],
                            token,
                        },
                    ];
                default:
                    return;
            }
        })();
        // no supported function detected
        if (!transfers)
            return;
        return await Promise.resolve({
            transfers,
            data: {
                parser: 'weth',
                method: decoded.name,
            },
        });
    }
}
exports.Parser = Parser;
