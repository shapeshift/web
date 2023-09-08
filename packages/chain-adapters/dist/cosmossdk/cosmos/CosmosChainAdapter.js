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
exports.ChainAdapter = exports.MIN_FEE = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const hdwallet_core_1 = require("@shapeshiftoss/hdwallet-core");
const types_1 = require("@shapeshiftoss/types");
const unchained = __importStar(require("@shapeshiftoss/unchained-client"));
const ErrorHandler_1 = require("../../error/ErrorHandler");
const types_2 = require("../../types");
const utils_1 = require("../../utils");
const CosmosSdkBaseAdapter_1 = require("../CosmosSdkBaseAdapter");
exports.MIN_FEE = '2500';
const SUPPORTED_CHAIN_IDS = [types_1.KnownChainIds.CosmosMainnet];
const DEFAULT_CHAIN_ID = types_1.KnownChainIds.CosmosMainnet;
class ChainAdapter extends CosmosSdkBaseAdapter_1.CosmosSdkBaseAdapter {
    constructor(args) {
        super({
            assetId: caip_1.cosmosAssetId,
            chainId: DEFAULT_CHAIN_ID,
            defaultBIP44Params: ChainAdapter.defaultBIP44Params,
            denom: 'uatom',
            parser: new unchained.cosmos.TransactionParser({
                assetId: caip_1.cosmosAssetId,
                chainId: args.chainId ?? DEFAULT_CHAIN_ID,
            }),
            supportedChainIds: SUPPORTED_CHAIN_IDS,
            ...args,
        });
    }
    getDisplayName() {
        return types_2.ChainAdapterDisplayName.Cosmos;
    }
    getName() {
        const enumIndex = Object.values(types_2.ChainAdapterDisplayName).indexOf(types_2.ChainAdapterDisplayName.Cosmos);
        return Object.keys(types_2.ChainAdapterDisplayName)[enumIndex];
    }
    getType() {
        return types_1.KnownChainIds.CosmosMainnet;
    }
    getFeeAssetId() {
        return this.assetId;
    }
    async getAddress(input) {
        const { accountNumber, wallet, showOnDevice = false } = input;
        try {
            if ((0, hdwallet_core_1.supportsCosmos)(wallet)) {
                const bip44Params = this.getBIP44Params({ accountNumber });
                const cosmosAddress = await wallet.cosmosGetAddress({
                    addressNList: (0, utils_1.toAddressNList)(bip44Params),
                    showDisplay: showOnDevice,
                });
                if (!cosmosAddress) {
                    throw new Error('Unable to generate Cosmos address.');
                }
                return cosmosAddress;
            }
            else {
                throw new Error('Wallet does not support Cosmos.');
            }
        }
        catch (error) {
            return (0, ErrorHandler_1.ErrorHandler)(error);
        }
    }
    async buildSendApiTransaction(input) {
        try {
            const { sendMax, to, value, from, chainSpecific } = input;
            const { fee } = chainSpecific;
            if (!fee)
                throw new Error('fee is required');
            const account = await this.getAccount(from);
            const amount = this.getAmount({ account, value, fee, sendMax });
            const msg = {
                type: 'cosmos-sdk/MsgSend',
                value: {
                    amount: [{ amount, denom: this.denom }],
                    from_address: from,
                    to_address: to,
                },
            };
            return this.buildTransaction({ ...input, account, msg });
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildSendTransaction(input) {
        const { accountNumber, wallet } = input;
        const from = await this.getAddress({ accountNumber, wallet });
        return this.buildSendApiTransaction({ ...input, from });
    }
    async buildDelegateTransaction(tx) {
        try {
            const { accountNumber, chainSpecific, sendMax, validator, value, wallet } = tx;
            const { fee } = chainSpecific;
            if (!fee)
                throw new Error('fee is required');
            (0, CosmosSdkBaseAdapter_1.assertIsValidatorAddress)(validator, this.getType());
            const from = await this.getAddress({ accountNumber, wallet });
            const account = await this.getAccount(from);
            const validatorAction = { address: validator, type: 'delegate' };
            const amount = this.getAmount({ account, value, fee, sendMax, validatorAction });
            const msg = {
                type: 'cosmos-sdk/MsgDelegate',
                value: {
                    amount: { amount, denom: this.denom },
                    delegator_address: from,
                    validator_address: validator,
                },
            };
            return this.buildTransaction({ ...tx, account, msg });
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildUndelegateTransaction(tx) {
        try {
            const { accountNumber, chainSpecific, sendMax, validator, value, wallet } = tx;
            const { fee } = chainSpecific;
            if (!fee)
                throw new Error('fee is required');
            (0, CosmosSdkBaseAdapter_1.assertIsValidatorAddress)(validator, this.getType());
            const from = await this.getAddress({ accountNumber, wallet });
            const account = await this.getAccount(from);
            const validatorAction = { address: validator, type: 'undelegate' };
            const amount = this.getAmount({ account, value, fee, sendMax, validatorAction });
            const msg = {
                type: 'cosmos-sdk/MsgUndelegate',
                value: {
                    amount: { amount, denom: this.denom },
                    delegator_address: from,
                    validator_address: validator,
                },
            };
            return this.buildTransaction({ ...tx, account, msg });
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildRedelegateTransaction(tx) {
        try {
            const { accountNumber, chainSpecific, fromValidator, sendMax, toValidator, value, wallet } = tx;
            const { fee } = chainSpecific;
            if (!fee)
                throw new Error('fee is required');
            (0, CosmosSdkBaseAdapter_1.assertIsValidatorAddress)(toValidator, this.getType());
            (0, CosmosSdkBaseAdapter_1.assertIsValidatorAddress)(fromValidator, this.getType());
            const from = await this.getAddress({ accountNumber, wallet });
            const account = await this.getAccount(from);
            const validatorAction = { address: fromValidator, type: 'redelegate' };
            const amount = this.getAmount({ account, value, fee, sendMax, validatorAction });
            const msg = {
                type: 'cosmos-sdk/MsgBeginRedelegate',
                value: {
                    amount: { amount, denom: this.denom },
                    delegator_address: from,
                    validator_src_address: fromValidator,
                    validator_dst_address: toValidator,
                },
            };
            return this.buildTransaction({ ...tx, account, msg });
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async buildClaimRewardsTransaction(tx) {
        try {
            const { accountNumber, validator, wallet } = tx;
            (0, CosmosSdkBaseAdapter_1.assertIsValidatorAddress)(validator, this.getType());
            const from = await this.getAddress({ accountNumber, wallet });
            const account = await this.getAccount(from);
            const msg = {
                type: 'cosmos-sdk/MsgWithdrawDelegationReward',
                value: {
                    delegator_address: from,
                    validator_address: validator,
                },
            };
            return this.buildTransaction({ ...tx, account, msg });
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async signTransaction(signTxInput) {
        try {
            const { txToSign, wallet } = signTxInput;
            if ((0, hdwallet_core_1.supportsCosmos)(wallet)) {
                const signedTx = await wallet.cosmosSignTx(txToSign);
                if (!signedTx)
                    throw new Error('Error signing tx');
                return signedTx.serialized;
            }
            else {
                throw new Error('Wallet does not support Cosmos.');
            }
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    // eslint-disable-next-line require-await
    async getFeeData(_) {
        const gasLimit = '300000';
        const scalars = { fast: (0, utils_1.bn)(2), average: (0, utils_1.bn)(1.5), slow: (0, utils_1.bn)(1) };
        // We currently don't have a way to query validators to get dynamic fees, so they are hard coded.
        // When we find a strategy to make this more dynamic, we can use 'sendMax' to define max amount.
        return {
            fast: { txFee: (0, utils_1.calcFee)(exports.MIN_FEE, 'fast', scalars), chainSpecific: { gasLimit } },
            average: { txFee: (0, utils_1.calcFee)(exports.MIN_FEE, 'average', scalars), chainSpecific: { gasLimit } },
            slow: { txFee: (0, utils_1.calcFee)(exports.MIN_FEE, 'slow', scalars), chainSpecific: { gasLimit } },
        };
    }
    async signAndBroadcastTransaction(signTxInput) {
        const { wallet } = signTxInput;
        try {
            if ((0, hdwallet_core_1.supportsCosmos)(wallet)) {
                const signedTx = await this.signTransaction(signTxInput);
                return this.providers.http.sendTx({ body: { rawTx: signedTx } });
            }
            else {
                throw new Error('Wallet does not support Cosmos.');
            }
        }
        catch (error) {
            return (0, ErrorHandler_1.ErrorHandler)(error);
        }
    }
}
exports.ChainAdapter = ChainAdapter;
ChainAdapter.defaultBIP44Params = {
    purpose: 44,
    coinType: Number(caip_1.ASSET_REFERENCE.Cosmos),
    accountNumber: 0,
};
