"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = exports.YEARN_VAULTS_URL = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const axios_1 = __importDefault(require("axios"));
const ethers_1 = require("ethers");
const parser_1 = require("../../parser");
const shapeShiftRouter_1 = require("./abi/shapeShiftRouter");
const yearnVault_1 = require("./abi/yearnVault");
const constants_1 = require("./constants");
exports.YEARN_VAULTS_URL = 'https://ydaemon.yearn.finance/api/1/vaults/all';
class Parser {
    constructor(args) {
        this.shapeShiftInterface = new ethers_1.ethers.utils.Interface(shapeShiftRouter_1.SHAPESHIFT_ROUTER_ABI);
        this.yearnInterface = new ethers_1.ethers.utils.Interface(yearnVault_1.YEARN_VAULT_ABI);
        this.supportedYearnFunctions = {
            approveSigHash: this.yearnInterface.getSighash('approve'),
            depositSigHash: this.yearnInterface.getSighash('deposit()'),
            depositAmountSigHash: this.yearnInterface.getSighash('deposit(uint256)'),
            depositAmountAndRecipientSigHash: this.yearnInterface.getSighash('deposit(uint256,address)'),
            withdrawSigHash: this.yearnInterface.getSighash('withdraw(uint256,address)'),
        };
        this.supportedShapeShiftFunctions = {
            depositSigHash: this.shapeShiftInterface.getSighash('deposit(address,address,uint256,uint256)'),
        };
        this.chainId = args.chainId;
    }
    async parse(tx) {
        if (!tx.inputData)
            return;
        const txSigHash = (0, parser_1.getSigHash)(tx.inputData);
        const supportedSigHashes = [
            ...Object.values(this.supportedShapeShiftFunctions),
            ...Object.values(this.supportedYearnFunctions),
        ];
        if (!supportedSigHashes.some(hash => hash === txSigHash))
            return;
        const abiInterface = this.getAbiInterface(txSigHash);
        if (!abiInterface)
            return;
        if (!this.yearnTokenVaultAddresses) {
            try {
                const { data } = await axios_1.default.get(exports.YEARN_VAULTS_URL);
                this.yearnTokenVaultAddresses = data?.map(vault => vault.address);
            }
            catch (err) {
                console.error(err);
                return;
            }
        }
        const decoded = abiInterface.parseTransaction({ data: tx.inputData });
        // failed to decode input data
        if (!decoded)
            return;
        const data = {
            method: decoded.name,
            parser: 'yearn',
        };
        switch (txSigHash) {
            case this.supportedYearnFunctions.approveSigHash: {
                if (decoded.args._spender !== constants_1.SHAPE_SHIFT_ROUTER_CONTRACT)
                    return;
                const value = decoded.args._value;
                const assetId = (0, caip_1.toAssetId)({
                    chainId: this.chainId,
                    assetNamespace: 'erc20',
                    assetReference: tx.to,
                });
                if (value.isZero()) {
                    return { data: { ...data, assetId, method: 'revoke', value: value.toString() } };
                }
                return { data: { ...data, assetId, value: value.toString() } };
            }
            case this.supportedShapeShiftFunctions.depositSigHash:
                if (tx.to !== constants_1.SHAPE_SHIFT_ROUTER_CONTRACT)
                    return;
                return { data };
            case this.supportedYearnFunctions.depositAmountAndRecipientSigHash:
                if (tx.to && !this.yearnTokenVaultAddresses?.includes(tx.to))
                    return;
                return { data };
            case this.supportedYearnFunctions.withdrawSigHash:
            case this.supportedYearnFunctions.depositSigHash:
            case this.supportedYearnFunctions.depositAmountSigHash:
            default:
                return { data };
        }
    }
    getAbiInterface(txSigHash) {
        if (Object.values(this.supportedYearnFunctions).some(abi => abi === txSigHash))
            return this.yearnInterface;
        if (Object.values(this.supportedShapeShiftFunctions).some(abi => abi === txSigHash))
            return this.shapeShiftInterface;
        return undefined;
    }
}
exports.Parser = Parser;
