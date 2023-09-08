"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const ethers_1 = require("ethers");
const parser_1 = require("../../parser");
const foxyStaking_1 = require("./abi/foxyStaking");
const constants_1 = require("./constants");
class Parser {
    constructor() {
        this.abiInterface = new ethers_1.ethers.utils.Interface(foxyStaking_1.FOXY_STAKING_ABI);
        this.supportedFunctions = {
            stakeSigHash: this.abiInterface.getSighash('stake(uint256,address)'),
            unstakeSigHash: this.abiInterface.getSighash('unstake'),
            instantUnstakeSigHash: this.abiInterface.getSighash('instantUnstake'),
            claimWithdrawSigHash: this.abiInterface.getSighash('claimWithdraw'),
        };
    }
    async parse(tx) {
        if (!(0, parser_1.txInteractsWithContract)(tx, constants_1.FOXY_STAKING_CONTRACT))
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
        return await Promise.resolve({
            data: {
                method: decoded.name,
                parser: 'foxy',
            },
        });
    }
}
exports.Parser = Parser;
