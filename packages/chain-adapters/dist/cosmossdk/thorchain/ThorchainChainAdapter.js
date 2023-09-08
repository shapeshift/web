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
exports.ChainAdapter = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const hdwallet_core_1 = require("@shapeshiftoss/hdwallet-core");
const types_1 = require("@shapeshiftoss/types");
const unchained = __importStar(require("@shapeshiftoss/unchained-client"));
const ErrorHandler_1 = require("../../error/ErrorHandler");
const types_2 = require("../../types");
const utils_1 = require("../../utils");
const bignumber_1 = require("../../utils/bignumber");
const CosmosSdkBaseAdapter_1 = require("../CosmosSdkBaseAdapter");
// https://dev.thorchain.org/thorchain-dev/interface-guide/fees#thorchain-native-rune
// static automatic outbound fee as defined by: https://thornode.ninerealms.com/thorchain/constants
const OUTBOUND_FEE = '2000000';
const SUPPORTED_CHAIN_IDS = [types_1.KnownChainIds.ThorchainMainnet];
const DEFAULT_CHAIN_ID = types_1.KnownChainIds.ThorchainMainnet;
const calculateFee = (fee) => {
    // 0.02 RUNE is automatically charged on outbound transactions
    // the returned is the difference of any additional fee over the default 0.02 RUNE (ie. tx.fee >= 2000001)
    const feeMinusAutomaticOutboundFee = (0, bignumber_1.bnOrZero)(fee).minus(OUTBOUND_FEE);
    return feeMinusAutomaticOutboundFee.gt(0) ? feeMinusAutomaticOutboundFee.toString() : '0';
};
class ChainAdapter extends CosmosSdkBaseAdapter_1.CosmosSdkBaseAdapter {
    constructor(args) {
        super({
            assetId: caip_1.thorchainAssetId,
            chainId: DEFAULT_CHAIN_ID,
            defaultBIP44Params: ChainAdapter.defaultBIP44Params,
            denom: 'rune',
            parser: new unchained.thorchain.TransactionParser({
                assetId: caip_1.thorchainAssetId,
                chainId: args.chainId ?? DEFAULT_CHAIN_ID,
            }),
            supportedChainIds: SUPPORTED_CHAIN_IDS,
            ...args,
        });
    }
    getDisplayName() {
        return types_2.ChainAdapterDisplayName.Thorchain;
    }
    getName() {
        const enumIndex = Object.values(types_2.ChainAdapterDisplayName).indexOf(types_2.ChainAdapterDisplayName.Thorchain);
        return Object.keys(types_2.ChainAdapterDisplayName)[enumIndex];
    }
    getType() {
        return types_1.KnownChainIds.ThorchainMainnet;
    }
    getFeeAssetId() {
        return this.assetId;
    }
    async getAddress(input) {
        const { wallet, accountNumber, showOnDevice = false } = input;
        const bip44Params = this.getBIP44Params({ accountNumber });
        try {
            if ((0, hdwallet_core_1.supportsThorchain)(wallet)) {
                const address = await wallet.thorchainGetAddress({
                    addressNList: (0, utils_1.toAddressNList)(bip44Params),
                    showDisplay: showOnDevice,
                });
                if (!address) {
                    throw new Error('Unable to generate Thorchain address.');
                }
                return address;
            }
            else {
                throw new Error('Wallet does not support Thorchain.');
            }
        }
        catch (error) {
            return (0, ErrorHandler_1.ErrorHandler)(error);
        }
    }
    async signTransaction(signTxInput) {
        try {
            const { txToSign, wallet } = signTxInput;
            if ((0, hdwallet_core_1.supportsThorchain)(wallet)) {
                const signedTx = await wallet.thorchainSignTx(txToSign);
                if (!signedTx)
                    throw new Error('Error signing tx');
                return signedTx.serialized;
            }
            else {
                throw new Error('Wallet does not support Thorchain.');
            }
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
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
                type: 'thorchain/MsgSend',
                value: {
                    amount: [{ amount, denom: this.denom }],
                    from_address: from,
                    to_address: to,
                },
            };
            const tx = Object.assign(input, {
                account,
                msg,
                chainSpecific: { ...input.chainSpecific, fee: calculateFee(fee) },
            });
            return this.buildTransaction(tx);
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
    /* MsgDeposit is used for thorchain swap/lp operations */
    async buildDepositTransaction(input) {
        try {
            // TODO memo validation
            const { from, value, memo, chainSpecific } = input;
            const { fee } = chainSpecific;
            if (!fee)
                throw new Error('fee is required');
            const account = await this.getAccount(from);
            // https://dev.thorchain.org/thorchain-dev/concepts/memos#asset-notation
            const msg = {
                type: 'thorchain/MsgDeposit',
                value: {
                    coins: [{ asset: 'THOR.RUNE', amount: (0, bignumber_1.bnOrZero)(value).toString() }],
                    memo,
                    signer: from,
                },
            };
            const tx = Object.assign(input, {
                account,
                msg,
                chainSpecific: { ...input.chainSpecific, fee: calculateFee(fee) },
            });
            return this.buildTransaction(tx);
        }
        catch (err) {
            return (0, ErrorHandler_1.ErrorHandler)(err);
        }
    }
    // eslint-disable-next-line require-await
    async getFeeData(_) {
        return {
            fast: { txFee: OUTBOUND_FEE, chainSpecific: { gasLimit: '500000000' } },
            average: { txFee: OUTBOUND_FEE, chainSpecific: { gasLimit: '500000000' } },
            slow: { txFee: OUTBOUND_FEE, chainSpecific: { gasLimit: '500000000' } },
        };
    }
    async signAndBroadcastTransaction(signTxInput) {
        const { wallet } = signTxInput;
        try {
            if ((0, hdwallet_core_1.supportsThorchain)(wallet)) {
                const signedTx = await this.signTransaction(signTxInput);
                return this.providers.http.sendTx({ body: { rawTx: signedTx } });
            }
            else {
                throw new Error('Wallet does not support Thorchain.');
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
    coinType: Number(caip_1.ASSET_REFERENCE.Thorchain),
    accountNumber: 0,
};
