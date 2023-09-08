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
exports.CosmosSdkBaseAdapter = exports.cosmosSdkChainIds = exports.assertIsValidatorAddress = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("@shapeshiftoss/types");
const unchained = __importStar(require("@shapeshiftoss/unchained-client"));
const bech32_1 = require("bech32");
const ErrorHandler_1 = require("../error/ErrorHandler");
const types_2 = require("../types");
const utils_1 = require("../utils");
const bignumber_1 = require("../utils/bignumber");
const CHAIN_ID_TO_BECH32_ADDR_PREFIX = {
    [types_1.KnownChainIds.CosmosMainnet]: 'cosmos',
    [types_1.KnownChainIds.ThorchainMainnet]: 'thor',
};
const CHAIN_ID_TO_BECH32_VAL_PREFIX = {
    [types_1.KnownChainIds.CosmosMainnet]: 'cosmosvaloper',
    [types_1.KnownChainIds.ThorchainMainnet]: 'thorv',
};
const assertIsValidatorAddress = (validator, chainId) => {
    if (CHAIN_ID_TO_BECH32_VAL_PREFIX[chainId] !== bech32_1.bech32.decode(validator).prefix) {
        throw new Error(`CosmosSdkBaseAdapter: invalid validator address ${validator}`);
    }
};
exports.assertIsValidatorAddress = assertIsValidatorAddress;
const transformValidator = (validator) => ({
    address: validator.address,
    moniker: validator.moniker,
    tokens: validator.tokens,
    commission: validator.commission.rate,
    apr: validator.apr,
});
const parsedTxToTransaction = (parsedTx) => ({
    ...parsedTx,
    transfers: parsedTx.transfers.map(transfer => ({
        assetId: transfer.assetId,
        from: transfer.from,
        to: transfer.to,
        type: transfer.type,
        value: transfer.totalValue,
    })),
});
exports.cosmosSdkChainIds = [
    types_1.KnownChainIds.CosmosMainnet,
    types_1.KnownChainIds.ThorchainMainnet,
];
class CosmosSdkBaseAdapter {
    constructor(args) {
        this.assetId = args.assetId;
        this.chainId = args.chainId;
        this.coinName = args.coinName;
        this.defaultBIP44Params = args.defaultBIP44Params;
        this.denom = args.denom;
        this.parser = args.parser;
        this.providers = args.providers;
        this.supportedChainIds = args.supportedChainIds;
        if (!this.supportedChainIds.includes(this.chainId)) {
            throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`);
        }
    }
    getChainId() {
        return this.chainId;
    }
    getBIP44Params({ accountNumber }) {
        if (accountNumber < 0) {
            throw new Error('accountNumber must be >= 0');
        }
        return { ...this.defaultBIP44Params, accountNumber };
    }
    async getAccount(pubkey) {
        try {
            const account = await (async () => {
                if (this.providers.http instanceof unchained.thorchain.V1Api) {
                    const data = await this.providers.http.getAccount({ pubkey });
                    return { ...data, delegations: [], redelegations: [], undelegations: [], rewards: [] };
                }
                const data = await this.providers.http.getAccount({ pubkey });
                const delegations = data.delegations.map(delegation => ({
                    assetId: this.assetId,
                    amount: delegation.balance.amount,
                    validator: transformValidator(delegation.validator),
                }));
                const redelegations = data.redelegations.map(redelegation => ({
                    destinationValidator: transformValidator(redelegation.destinationValidator),
                    sourceValidator: transformValidator(redelegation.sourceValidator),
                    entries: redelegation.entries.map(entry => ({
                        assetId: this.assetId,
                        completionTime: Number(entry.completionTime),
                        amount: entry.balance,
                    })),
                }));
                const undelegations = data.unbondings.map(undelegation => ({
                    validator: transformValidator(undelegation.validator),
                    entries: undelegation.entries.map(entry => ({
                        assetId: this.assetId,
                        completionTime: Number(entry.completionTime),
                        amount: entry.balance.amount,
                    })),
                }));
                const rewards = data.rewards.map(validatorReward => ({
                    validator: transformValidator(validatorReward.validator),
                    rewards: validatorReward.rewards
                        // We only support same-denom rewards for now
                        .filter(reward => reward.denom === this.denom)
                        .map(reward => ({
                        assetId: this.assetId,
                        amount: reward.amount,
                    })),
                }));
                const assets = data.assets.map(asset => ({
                    amount: asset.amount,
                    assetId: (0, caip_1.generateAssetIdFromCosmosSdkDenom)(asset.denom, this.getFeeAssetId()),
                }));
                return { ...data, delegations, redelegations, undelegations, rewards, assets };
            })();
            return {
                balance: account.balance,
                chainId: this.chainId,
                assetId: this.assetId,
                chain: this.getType(),
                chainSpecific: {
                    accountNumber: account.accountNumber.toString(),
                    assets: account.assets,
                    sequence: account.sequence.toString(),
                    delegations: account.delegations,
                    redelegations: account.redelegations,
                    undelegations: account.undelegations,
                    rewards: account.rewards,
                },
                pubkey: account.pubkey,
            };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getTxHistory(input) {
        try {
            const data = await this.providers.http.getTxHistory({
                pubkey: input.pubkey,
                pageSize: input.pageSize,
                cursor: input.cursor,
            });
            const txs = await Promise.all(data.txs.map(async (tx) => {
                const parsedTx = await this.parser.parse(tx, input.pubkey);
                return parsedTxToTransaction(parsedTx);
            }));
            return {
                cursor: data.cursor,
                pubkey: input.pubkey,
                transactions: txs,
            };
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    getAmount({ account, value, fee, sendMax, validatorAction, }) {
        if (!sendMax)
            return value;
        const availableBalance = (() => {
            switch (validatorAction?.type) {
                case 'undelegate':
                case 'redelegate':
                    return (0, bignumber_1.bnOrZero)(account.chainSpecific.delegations.find(delegation => delegation.validator.address === validatorAction.address)?.amount);
                default:
                    return (0, bignumber_1.bnOrZero)(account.balance);
            }
        })().minus(fee);
        if (!availableBalance.isFinite() || availableBalance.lte(0)) {
            throw new Error(`CosmosSdkBaseAdapter: not enough balance to send: ${availableBalance.toString()}`);
        }
        return availableBalance.toString();
    }
    buildTransaction(input) {
        const { account, accountNumber, msg, memo = '', chainSpecific } = input;
        const { gas, fee } = chainSpecific;
        const bip44Params = this.getBIP44Params({ accountNumber });
        const unsignedTx = {
            fee: { amount: [{ amount: (0, bignumber_1.bnOrZero)(fee).toString(), denom: this.denom }], gas },
            msg: [msg],
            signatures: [],
            memo,
        };
        const txToSign = {
            addressNList: (0, utils_1.toAddressNList)(bip44Params),
            tx: unsignedTx,
            chain_id: (0, caip_1.fromChainId)(this.getType()).chainReference,
            account_number: account.chainSpecific.accountNumber,
            sequence: account.chainSpecific.sequence,
        };
        return { txToSign };
    }
    broadcastTransaction(hex) {
        try {
            return this.providers.http.sendTx({ body: { rawTx: hex } });
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    // eslint-disable-next-line require-await
    async validateAddress(address) {
        const chain = this.getType();
        try {
            const { prefix } = bech32_1.bech32.decode(address);
            if (CHAIN_ID_TO_BECH32_ADDR_PREFIX[chain] !== prefix) {
                throw new Error(`Invalid address ${address} for ChainId: ${chain}`);
            }
            return {
                valid: true,
                result: types_2.ValidAddressResultType.Valid,
            };
        }
        catch (err) {
            return { valid: false, result: types_2.ValidAddressResultType.Invalid };
        }
    }
    async subscribeTxs(input, onMessage, onError) {
        const { accountNumber, wallet } = input;
        const bip44Params = this.getBIP44Params({ accountNumber });
        const address = await this.getAddress({ accountNumber, wallet });
        const subscriptionId = (0, utils_1.toRootDerivationPath)(bip44Params);
        await this.providers.ws.subscribeTxs(subscriptionId, { topic: 'txs', addresses: [address] }, async (msg) => {
            const parsedTx = await this.parser.parse(msg.data, msg.address);
            onMessage(parsedTxToTransaction(parsedTx));
        }, err => onError({ message: err.message }));
    }
    unsubscribeTxs(input) {
        if (!input)
            return this.providers.ws.unsubscribeTxs();
        const { accountNumber } = input;
        const bip44Params = this.getBIP44Params({ accountNumber });
        const subscriptionId = (0, utils_1.toRootDerivationPath)(bip44Params);
        this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] });
    }
    closeTxs() {
        this.providers.ws.close('txs');
    }
    async getValidators() {
        if (this.providers.http instanceof unchained.thorchain.V1Api)
            return [];
        try {
            const data = await this.providers.http.getValidators();
            return data.validators.map(validator => transformValidator(validator));
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    async getValidator(address) {
        if (this.providers.http instanceof unchained.thorchain.V1Api)
            return;
        try {
            const validator = await this.providers.http.getValidator({ pubkey: address });
            return transformValidator(validator);
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
}
exports.CosmosSdkBaseAdapter = CosmosSdkBaseAdapter;
