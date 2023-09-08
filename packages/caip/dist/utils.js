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
exports.thorchainAssetMap = exports.cosmosAssetMap = exports.litecoinAssetMap = exports.dogecoinAssetMap = exports.bitcoinCashAssetMap = exports.bitcoinAssetMap = exports.generateAssetIdFromCosmosSdkDenom = exports.isValidChainPartsPair = exports.accountIdToSpecifier = exports.accountIdToChainId = void 0;
const accountId_1 = require("./accountId/accountId");
const assetId_1 = require("./assetId/assetId");
const constants = __importStar(require("./constants"));
const accountIdToChainId = (accountId) => (0, accountId_1.fromAccountId)(accountId).chainId;
exports.accountIdToChainId = accountIdToChainId;
const accountIdToSpecifier = (accountId) => (0, accountId_1.fromAccountId)(accountId).account;
exports.accountIdToSpecifier = accountIdToSpecifier;
const isValidChainPartsPair = (chainNamespace, chainReference) => constants.VALID_CHAIN_IDS[chainNamespace]?.includes(chainReference) || false;
exports.isValidChainPartsPair = isValidChainPartsPair;
const generateAssetIdFromCosmosSdkDenom = (denom, nativeAssetId) => {
    if (denom.startsWith('ibc')) {
        return (0, assetId_1.toAssetId)({
            assetNamespace: constants.ASSET_NAMESPACE.ibc,
            assetReference: denom.split('/')[1],
            chainId: (0, assetId_1.fromAssetId)(nativeAssetId).chainId,
        });
    }
    return nativeAssetId;
};
exports.generateAssetIdFromCosmosSdkDenom = generateAssetIdFromCosmosSdkDenom;
exports.bitcoinAssetMap = { [constants.btcAssetId]: 'bitcoin' };
exports.bitcoinCashAssetMap = { [constants.bchAssetId]: 'bitcoin-cash' };
exports.dogecoinAssetMap = { [constants.dogeAssetId]: 'dogecoin' };
exports.litecoinAssetMap = { [constants.ltcAssetId]: 'litecoin' };
exports.cosmosAssetMap = { [constants.cosmosAssetId]: 'cosmos' };
exports.thorchainAssetMap = { [constants.thorchainAssetId]: 'thorchain' };
