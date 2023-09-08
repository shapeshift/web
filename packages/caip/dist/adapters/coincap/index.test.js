"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assetId_1 = require("../../assetId/assetId");
const constants_1 = require("../../constants");
const _1 = require(".");
describe('adapters:coincap', () => {
    describe('coincapToAssetId', () => {
        it('can get AssetId for bitcoin', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
            });
            expect((0, _1.coincapToAssetId)('bitcoin')).toEqual(assetId);
        });
        it('can get AssetId id for ethereum', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
            });
            expect((0, _1.coincapToAssetId)('ethereum')).toEqual(assetId);
        });
        it('can get AssetId id for FOX', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetNamespace = 'erc20';
            const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d';
            const assetId = (0, assetId_1.toAssetId)({ chainNamespace, chainReference, assetNamespace, assetReference });
            expect((0, _1.coincapToAssetId)('fox-token')).toEqual(assetId);
        });
    });
    it('can get AssetId for cosmos', () => {
        const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
        const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
        const assetId = (0, assetId_1.toAssetId)({
            chainNamespace,
            chainReference,
            assetNamespace: 'slip44',
            assetReference: constants_1.ASSET_REFERENCE.Cosmos,
        });
        expect((0, _1.coincapToAssetId)('cosmos')).toEqual(assetId);
    });
    describe('assetIdToCoinCap', () => {
        it('can get coincap id for bitcoin AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
            });
            expect((0, _1.assetIdToCoinCap)(assetId)).toEqual('bitcoin');
        });
        it('can get coincap id for ethereum AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
            });
            expect((0, _1.assetIdToCoinCap)(assetId)).toEqual('ethereum');
        });
        it('can get coincap id for FOX', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetNamespace = 'erc20';
            const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d';
            const assetId = (0, assetId_1.toAssetId)({ chainNamespace, chainReference, assetNamespace, assetReference });
            expect((0, _1.assetIdToCoinCap)(assetId)).toEqual('fox-token');
        });
        it('can get coincap id for cosmos AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
            });
            expect((0, _1.assetIdToCoinCap)(assetId)).toEqual('cosmos');
        });
    });
});
