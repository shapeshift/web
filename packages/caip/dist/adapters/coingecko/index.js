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
exports.makeCoingeckoAssetUrl = exports.chainIdToCoingeckoAssetPlatform = exports.assetIdToCoingecko = exports.coingeckoToAssetIds = exports.coingeckoUrl = exports.coingeckoProBaseUrl = exports.coingeckoBaseUrl = exports.CoingeckoAssetPlatform = void 0;
const invertBy_1 = __importDefault(require("lodash/invertBy"));
const toLower_1 = __importDefault(require("lodash/toLower"));
const assetId_1 = require("../../assetId/assetId");
const chainId_1 = require("../../chainId/chainId");
const constants_1 = require("../../constants");
const adapters = __importStar(require("./generated"));
// https://api.coingecko.com/api/v3/asset_platforms
var CoingeckoAssetPlatform;
(function (CoingeckoAssetPlatform) {
    CoingeckoAssetPlatform["Ethereum"] = "ethereum";
    CoingeckoAssetPlatform["Cosmos"] = "cosmos";
    CoingeckoAssetPlatform["Polygon"] = "polygon-pos";
    CoingeckoAssetPlatform["Gnosis"] = "xdai";
    CoingeckoAssetPlatform["Avalanche"] = "avalanche";
    CoingeckoAssetPlatform["Thorchain"] = "thorchain";
    CoingeckoAssetPlatform["Optimism"] = "optimistic-ethereum";
    CoingeckoAssetPlatform["BnbSmartChain"] = "binance-smart-chain";
})(CoingeckoAssetPlatform || (exports.CoingeckoAssetPlatform = CoingeckoAssetPlatform = {}));
// markets.shapeshift.com is a coingecko proxy maintained by the fox foundation
exports.coingeckoBaseUrl = 'https://markets.shapeshift.com/api/v3';
// export const coingeckoBaseUrl = 'http://localhost:1137/api/v3'
exports.coingeckoProBaseUrl = exports.coingeckoBaseUrl;
exports.coingeckoUrl = `${exports.coingeckoBaseUrl}/coins/list?include_platform=true`;
const assetIdToCoinGeckoIdMapByChain = Object.values(adapters);
const generatedAssetIdToCoingeckoMap = assetIdToCoinGeckoIdMapByChain.reduce((acc, cur) => ({
    ...acc,
    ...cur,
}));
const generatedCoingeckoToAssetIdsMap = (0, invertBy_1.default)(generatedAssetIdToCoingeckoMap);
const coingeckoToAssetIds = (id) => generatedCoingeckoToAssetIdsMap[id];
exports.coingeckoToAssetIds = coingeckoToAssetIds;
const assetIdToCoingecko = (assetId) => generatedAssetIdToCoingeckoMap[(0, toLower_1.default)(assetId)];
exports.assetIdToCoingecko = assetIdToCoingecko;
// https://www.coingecko.com/en/api/documentation - See asset_platforms
const chainIdToCoingeckoAssetPlatform = (chainId) => {
    const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(chainId);
    switch (chainNamespace) {
        case constants_1.CHAIN_NAMESPACE.Evm:
            switch (chainReference) {
                case constants_1.CHAIN_REFERENCE.EthereumMainnet:
                    return CoingeckoAssetPlatform.Ethereum;
                case constants_1.CHAIN_REFERENCE.AvalancheCChain:
                    return CoingeckoAssetPlatform.Avalanche;
                case constants_1.CHAIN_REFERENCE.OptimismMainnet:
                    return CoingeckoAssetPlatform.Optimism;
                case constants_1.CHAIN_REFERENCE.BnbSmartChainMainnet:
                    return CoingeckoAssetPlatform.BnbSmartChain;
                case constants_1.CHAIN_REFERENCE.PolygonMainnet:
                    return CoingeckoAssetPlatform.Polygon;
                case constants_1.CHAIN_REFERENCE.GnosisMainnet:
                    return CoingeckoAssetPlatform.Gnosis;
                default:
                    throw new Error(`chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`);
            }
        case constants_1.CHAIN_NAMESPACE.CosmosSdk:
            switch (chainReference) {
                case constants_1.CHAIN_REFERENCE.CosmosHubMainnet:
                    return CoingeckoAssetPlatform.Cosmos;
                case constants_1.CHAIN_REFERENCE.ThorchainMainnet:
                    return CoingeckoAssetPlatform.Thorchain;
                default:
                    throw new Error(`chainNamespace ${chainNamespace}, chainReference ${chainReference} not supported.`);
            }
        // No valid asset platform: https://api.coingecko.com/api/v3/asset_platforms
        case constants_1.CHAIN_NAMESPACE.Utxo:
        default:
            throw new Error(`chainNamespace ${chainNamespace} not supported.`);
    }
};
exports.chainIdToCoingeckoAssetPlatform = chainIdToCoingeckoAssetPlatform;
const makeCoingeckoAssetUrl = (assetId) => {
    const id = (0, exports.assetIdToCoingecko)(assetId);
    if (!id)
        return;
    const { chainNamespace, chainReference, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(assetId);
    if (assetNamespace === 'erc20') {
        const assetPlatform = (0, exports.chainIdToCoingeckoAssetPlatform)((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
        return `${exports.coingeckoProBaseUrl}/coins/${assetPlatform}/contract/${assetReference}`;
    }
    return `${exports.coingeckoProBaseUrl}/coins/${id}`;
};
exports.makeCoingeckoAssetUrl = makeCoingeckoAssetUrl;
