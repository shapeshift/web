"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const ethers_1 = require("ethers");
const erc20_1 = require("./abi/erc20");
const utils_1 = require("./utils");
class Parser {
    constructor(args) {
        this.abiInterface = new ethers_1.ethers.utils.Interface(erc20_1.ERC20_ABI);
        this.supportedFunctions = {
            approveSigHash: this.abiInterface.getSighash('approve'),
        };
        this.provider = args.provider;
        this.chainId = args.chainId;
    }
    async parse(tx) {
        if (!tx.inputData)
            return;
        const txSigHash = (0, utils_1.getSigHash)(tx.inputData);
        if (!Object.values(this.supportedFunctions).some(hash => hash === txSigHash))
            return;
        const decoded = this.abiInterface.parseTransaction({ data: tx.inputData });
        // failed to decode input data
        if (!decoded)
            return;
        const data = {
            assetId: (0, caip_1.toAssetId)({
                chainId: this.chainId,
                assetNamespace: 'erc20',
                assetReference: tx.to,
            }),
            method: decoded.name,
            parser: 'erc20',
        };
        switch (txSigHash) {
            case this.supportedFunctions.approveSigHash: {
                const amount = decoded.args.amount;
                const value = amount.toString();
                if (amount.isZero()) {
                    return await Promise.resolve({ data: { ...data, method: 'revoke', value } });
                }
                return await Promise.resolve({ data: { ...data, value: value.toString() } });
            }
            default:
                return await Promise.resolve({ data });
        }
    }
}
exports.Parser = Parser;
