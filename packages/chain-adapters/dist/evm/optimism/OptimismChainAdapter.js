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
exports.ChainAdapter = exports.isOptimismChainAdapter = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const types_1 = require("@shapeshiftoss/types");
const unchained = __importStar(require("@shapeshiftoss/unchained-client"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const types_2 = require("../../types");
const utils_1 = require("../../utils");
const EvmBaseAdapter_1 = require("../EvmBaseAdapter");
const SUPPORTED_CHAIN_IDS = [types_1.KnownChainIds.OptimismMainnet];
const DEFAULT_CHAIN_ID = types_1.KnownChainIds.OptimismMainnet;
const isOptimismChainAdapter = (adapter) => {
    return adapter.getType() === types_1.KnownChainIds.OptimismMainnet;
};
exports.isOptimismChainAdapter = isOptimismChainAdapter;
class ChainAdapter extends EvmBaseAdapter_1.EvmBaseAdapter {
    constructor(args) {
        super({
            assetId: caip_1.optimismAssetId,
            chainId: DEFAULT_CHAIN_ID,
            defaultBIP44Params: ChainAdapter.defaultBIP44Params,
            parser: new unchained.optimism.TransactionParser({
                assetId: caip_1.optimismAssetId,
                chainId: args.chainId ?? DEFAULT_CHAIN_ID,
                rpcUrl: args.rpcUrl,
                api: args.providers.http,
            }),
            supportedChainIds: SUPPORTED_CHAIN_IDS,
            ...args,
        });
        this.api = args.providers.http;
    }
    getDisplayName() {
        return types_2.ChainAdapterDisplayName.Optimism;
    }
    getName() {
        const enumIndex = Object.values(types_2.ChainAdapterDisplayName).indexOf(types_2.ChainAdapterDisplayName.Optimism);
        return Object.keys(types_2.ChainAdapterDisplayName)[enumIndex];
    }
    getType() {
        return types_1.KnownChainIds.OptimismMainnet;
    }
    getFeeAssetId() {
        return this.assetId;
    }
    async getGasFeeData() {
        const { fast, average, slow, l1GasPrice } = await this.api.getGasFees();
        return {
            fast: { ...fast, l1GasPrice },
            average: { ...average, l1GasPrice },
            slow: { ...slow, l1GasPrice },
        };
    }
    async getFeeData(input) {
        const req = await this.buildEstimateGasRequest(input);
        const { gasLimit, l1GasLimit } = await this.api.estimateGas(req);
        const { fast, average, slow } = await this.getGasFeeData();
        return {
            fast: {
                txFee: (0, utils_1.bnOrZero)(bignumber_js_1.default.max(fast.gasPrice, fast.maxFeePerGas ?? 0)
                    .times(gasLimit)
                    .plus((0, utils_1.bnOrZero)(fast.l1GasPrice).times(l1GasLimit))).toFixed(0),
                chainSpecific: { gasLimit, l1GasLimit, ...fast },
            },
            average: {
                txFee: (0, utils_1.bnOrZero)(bignumber_js_1.default.max(average.gasPrice, average.maxFeePerGas ?? 0)
                    .times(gasLimit)
                    .plus((0, utils_1.bnOrZero)(average.l1GasPrice).times(l1GasLimit))).toFixed(0),
                chainSpecific: { gasLimit, l1GasLimit, ...average },
            },
            slow: {
                txFee: (0, utils_1.bnOrZero)(bignumber_js_1.default.max(slow.gasPrice, slow.maxFeePerGas ?? 0)
                    .times(gasLimit)
                    .plus((0, utils_1.bnOrZero)(slow.l1GasPrice).times(l1GasLimit))).toFixed(0),
                chainSpecific: { gasLimit, l1GasLimit, ...slow },
            },
        };
    }
}
exports.ChainAdapter = ChainAdapter;
ChainAdapter.defaultBIP44Params = {
    purpose: 44,
    coinType: Number(caip_1.ASSET_REFERENCE.Optimism),
    accountNumber: 0,
};
