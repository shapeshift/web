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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertNumberToHex = exports.chainIdToChainLabel = exports.getAssetNamespace = void 0;
const caip_1 = require("@shapeshiftoss/caip");
const ethers_1 = require("ethers");
__exportStar(require("./bignumber"), exports);
__exportStar(require("./bip44"), exports);
__exportStar(require("./fees"), exports);
__exportStar(require("./utxoUtils"), exports);
const getAssetNamespace = (type) => {
    if (type === 'ERC20')
        return 'erc20';
    if (type === 'ERC721')
        return 'erc721';
    if (type === 'ERC1155')
        return 'erc1155';
    if (type === 'BEP20')
        return 'bep20';
    if (type === 'BEP721')
        return 'bep721';
    if (type === 'BEP1155')
        return 'bep1155';
    throw new Error(`Unknown asset namespace. type: ${type}`);
};
exports.getAssetNamespace = getAssetNamespace;
const chainIdToChainLabel = (chainId) => {
    const { chainNamespace, chainReference } = (0, caip_1.fromChainId)(chainId);
    switch (chainNamespace) {
        case caip_1.CHAIN_NAMESPACE.Utxo:
            switch (chainReference) {
                case caip_1.CHAIN_REFERENCE.BitcoinMainnet:
                    return 'bitcoin';
                case caip_1.CHAIN_REFERENCE.BitcoinCashMainnet:
                    return 'bitcoincash';
                case caip_1.CHAIN_REFERENCE.DogecoinMainnet:
                    return 'dogecoin';
                case caip_1.CHAIN_REFERENCE.LitecoinMainnet:
                    return 'litecoin';
                default:
                    throw new Error(`chainReference: ${chainReference}, not supported for chainNamespace: ${chainNamespace}`);
            }
        case caip_1.CHAIN_NAMESPACE.Evm:
            switch (chainReference) {
                case caip_1.CHAIN_REFERENCE.EthereumMainnet:
                case caip_1.CHAIN_REFERENCE.EthereumRinkeby:
                case caip_1.CHAIN_REFERENCE.EthereumRopsten:
                case caip_1.CHAIN_REFERENCE.AvalancheCChain:
                case caip_1.CHAIN_REFERENCE.OptimismMainnet:
                case caip_1.CHAIN_REFERENCE.BnbSmartChainMainnet:
                case caip_1.CHAIN_REFERENCE.PolygonMainnet:
                case caip_1.CHAIN_REFERENCE.GnosisMainnet:
                    return 'ethereum'; // all evm chains use the same validator (https://github.com/christsim/multicoin-address-validator/blob/master/src/ethereum_validator.js)
                default:
                    throw new Error(`chainReference: ${chainReference}, not supported for chainNamespace: ${chainNamespace}`);
            }
        case caip_1.CHAIN_NAMESPACE.CosmosSdk:
            switch (chainReference) {
                case caip_1.CHAIN_REFERENCE.CosmosHubMainnet:
                case caip_1.CHAIN_REFERENCE.CosmosHubVega:
                    return 'cosmos';
                case caip_1.CHAIN_REFERENCE.ThorchainMainnet:
                    return 'thorchain';
                default:
                    throw new Error(`chainReference: ${chainReference}, not supported for chainNamespace: ${chainNamespace}`);
            }
        default:
            throw new Error(`chainNamespace ${chainNamespace} not supported.`);
    }
};
exports.chainIdToChainLabel = chainIdToChainLabel;
const convertNumberToHex = (value) => ethers_1.BigNumber.from(value).toHexString();
exports.convertNumberToHex = convertNumberToHex;
