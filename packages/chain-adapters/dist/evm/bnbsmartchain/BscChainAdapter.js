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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainAdapter = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("@shapeshiftoss/types");
const unchained = __importStar(require("@shapeshiftoss/unchained-client"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const types_2 = require("../../types");
const bignumber_1 = require("../../utils/bignumber");
const EvmBaseAdapter_1 = require("../EvmBaseAdapter");
const SUPPORTED_CHAIN_IDS = [types_1.KnownChainIds.BnbSmartChainMainnet];
const DEFAULT_CHAIN_ID = types_1.KnownChainIds.BnbSmartChainMainnet;
class ChainAdapter extends EvmBaseAdapter_1.EvmBaseAdapter {
    constructor(args) {
        super({
            assetId: caip_1.bscAssetId,
            chainId: DEFAULT_CHAIN_ID,
            defaultBIP44Params: ChainAdapter.defaultBIP44Params,
            parser: new unchained.bnbsmartchain.TransactionParser({
                assetId: caip_1.bscAssetId,
                chainId: args.chainId ?? DEFAULT_CHAIN_ID,
                rpcUrl: args.rpcUrl,
                api: args.providers.http,
            }),
            supportedChainIds: SUPPORTED_CHAIN_IDS,
            ...args,
        });
    }
    getDisplayName() {
        return types_2.ChainAdapterDisplayName.BnbSmartChain;
    }
    getName() {
        const enumIndex = Object.values(types_2.ChainAdapterDisplayName).indexOf(types_2.ChainAdapterDisplayName.BnbSmartChain);
        return Object.keys(types_2.ChainAdapterDisplayName)[enumIndex];
    }
    getType() {
        return types_1.KnownChainIds.BnbSmartChainMainnet;
    }
    getFeeAssetId() {
        return this.assetId;
    }
    async getGasFeeData() {
        const { fast, average, slow, baseFeePerGas } = await this.providers.http.getGasFees();
        return { fast, average, slow, baseFeePerGas };
    }
    async getFeeData(input) {
        const req = await this.buildEstimateGasRequest(input);
        const { gasLimit } = await this.providers.http.estimateGas(req);
        const { fast, average, slow, baseFeePerGas } = await this.getGasFeeData();
        // Binance official JSON-RPC endpoint has a minimum enforced gas price of 3 Gwei
        const MIN_GAS_PRICE = '3000000000';
        [fast, average, slow].forEach(estimate => {
            estimate.gasPrice = bignumber_js_1.default.max(estimate.gasPrice, MIN_GAS_PRICE).toFixed(0);
            if (estimate.maxFeePerGas) {
                estimate.maxFeePerGas = bignumber_js_1.default.max(estimate.maxFeePerGas, MIN_GAS_PRICE).toFixed(0);
            }
            if (estimate.maxPriorityFeePerGas) {
                estimate.maxPriorityFeePerGas = bignumber_js_1.default.max((0, bignumber_1.bn)(estimate.maxPriorityFeePerGas).plus((0, bignumber_1.bnOrZero)(baseFeePerGas)), MIN_GAS_PRICE)
                    .minus((0, bignumber_1.bnOrZero)(baseFeePerGas))
                    .toFixed(0);
            }
        });
        return {
            fast: {
                txFee: (0, bignumber_1.bnOrZero)(bignumber_js_1.default.max(fast.gasPrice, fast.maxFeePerGas ?? 0).times(gasLimit)).toFixed(0),
                chainSpecific: { gasLimit, ...fast, gasPrice: fast.gasPrice },
            },
            average: {
                txFee: (0, bignumber_1.bnOrZero)(bignumber_js_1.default.max(average.gasPrice, average.maxFeePerGas ?? 0).times(gasLimit)).toFixed(0),
                chainSpecific: { gasLimit, ...average, gasPrice: average.gasPrice },
            },
            slow: {
                txFee: (0, bignumber_1.bnOrZero)(bignumber_js_1.default.max(slow.gasPrice, slow.maxFeePerGas ?? 0).times(gasLimit)).toFixed(0),
                chainSpecific: { gasLimit, ...slow, gasPrice: slow.gasPrice },
            },
        };
    }
}
exports.ChainAdapter = ChainAdapter;
ChainAdapter.defaultBIP44Params = {
    purpose: 44,
    coinType: Number(caip_1.ASSET_REFERENCE.BnbSmartChain),
    accountNumber: 0,
};
