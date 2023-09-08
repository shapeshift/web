"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assetId_1 = require("../../assetId/assetId");
const constants_1 = require("../../constants");
const _1 = require(".");
describe('adapters:coingecko', () => {
    describe('coingeckoToAssetIds', () => {
        it('can get AssetIds for bitcoin', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
            });
            expect((0, _1.coingeckoToAssetIds)('bitcoin')).toEqual([assetId]);
        });
        it('can get AssetIds id for ethereum', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const ethOnEthereum = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.EthereumMainnet,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
            });
            const ethOnOptimism = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.OptimismMainnet,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Optimism,
            });
            expect((0, _1.coingeckoToAssetIds)('ethereum')).toEqual([ethOnEthereum, ethOnOptimism]);
        });
        it('can get AssetIds id for FOX', () => {
            const assetNamespace = 'erc20';
            const foxOnEthereum = (0, assetId_1.toAssetId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                chainReference: constants_1.CHAIN_REFERENCE.EthereumMainnet,
                assetNamespace,
                assetReference: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
            });
            const foxOnPolygon = (0, assetId_1.toAssetId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                chainReference: constants_1.CHAIN_REFERENCE.PolygonMainnet,
                assetNamespace,
                assetReference: '0x65a05db8322701724c197af82c9cae41195b0aa8',
            });
            const foxOnGnosis = (0, assetId_1.toAssetId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                chainReference: constants_1.CHAIN_REFERENCE.GnosisMainnet,
                assetNamespace,
                assetReference: '0x21a42669643f45bc0e086b8fc2ed70c23d67509d',
            });
            const foxOnOptimism = (0, assetId_1.toAssetId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                chainReference: constants_1.CHAIN_REFERENCE.OptimismMainnet,
                assetNamespace,
                assetReference: '0xf1a0da3367bc7aa04f8d94ba57b862ff37ced174',
            });
            expect((0, _1.coingeckoToAssetIds)('shapeshift-fox-token')).toEqual([
                foxOnEthereum,
                foxOnOptimism,
                foxOnPolygon,
                foxOnGnosis,
            ]);
        });
        it('can get AssetIds for cosmos', () => {
            const atomOnCosmos = (0, assetId_1.toAssetId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.CosmosSdk,
                chainReference: constants_1.CHAIN_REFERENCE.CosmosHubMainnet,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
            });
            const atomOnBsc = (0, assetId_1.toAssetId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.Evm,
                chainReference: constants_1.CHAIN_REFERENCE.BnbSmartChainMainnet,
                assetNamespace: 'bep20',
                assetReference: '0x0eb3a705fc54725037cc9e008bdede697f62f335',
            });
            expect((0, _1.coingeckoToAssetIds)('cosmos')).toEqual([atomOnCosmos, atomOnBsc]);
        });
        it('can get AssetIds for USD Coin on EVM Chains', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const assetNamespace = 'erc20';
            const usdcOnEthereum = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.EthereumMainnet,
                assetNamespace,
                assetReference: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            });
            const usdcOnAvalanche = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.AvalancheCChain,
                assetNamespace,
                assetReference: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
            });
            const usdcOnOptimism = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.OptimismMainnet,
                assetNamespace,
                assetReference: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
            });
            const usdcOnBsc = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.BnbSmartChainMainnet,
                assetNamespace: 'bep20',
                assetReference: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
            });
            const usdcOnPolygon = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.PolygonMainnet,
                assetNamespace,
                assetReference: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            });
            const usdcOnGnosis = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference: constants_1.CHAIN_REFERENCE.GnosisMainnet,
                assetNamespace,
                assetReference: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
            });
            expect((0, _1.coingeckoToAssetIds)('usd-coin')).toEqual([
                usdcOnEthereum,
                usdcOnAvalanche,
                usdcOnOptimism,
                usdcOnBsc,
                usdcOnPolygon,
                usdcOnGnosis,
            ]);
        });
    });
    describe('assetIdToCoingecko', () => {
        it('can get CoinGecko id for bitcoin AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
            });
            expect((0, _1.assetIdToCoingecko)(assetId)).toEqual('bitcoin');
        });
        it('can get CoinGecko id for ethereum AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
            });
            expect((0, _1.assetIdToCoingecko)(assetId)).toEqual('ethereum');
        });
        it('can get CoinGecko id for FOX', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetNamespace = 'erc20';
            const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d';
            const assetId = (0, assetId_1.toAssetId)({ chainNamespace, chainReference, assetNamespace, assetReference });
            expect((0, _1.assetIdToCoingecko)(assetId)).toEqual('shapeshift-fox-token');
        });
        it('can get CoinGecko id for cosmos AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
            });
            expect((0, _1.assetIdToCoingecko)(assetId)).toEqual('cosmos');
        });
        it('can get CoinGecko id for polygon AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.PolygonMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Polygon,
            });
            expect((0, _1.assetIdToCoingecko)(assetId)).toEqual('matic-network');
        });
        it('can get CoinGecko id for gnosis AssetId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.GnosisMainnet;
            const assetId = (0, assetId_1.toAssetId)({
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Gnosis,
            });
            console.log(assetId);
            expect((0, _1.assetIdToCoingecko)(assetId)).toEqual('xdai');
        });
    });
    describe('chainIdToCoingeckoAssetPlatform', () => {
        it('can get CoinGecko asset platform from ChainId', () => {
            const chainId = constants_1.ethChainId;
            expect((0, _1.chainIdToCoingeckoAssetPlatform)(chainId)).toEqual(_1.CoingeckoAssetPlatform.Ethereum);
        });
        it('throws on invalid ChainId', () => {
            const chainId = constants_1.btcChainId;
            expect(() => (0, _1.chainIdToCoingeckoAssetPlatform)(chainId)).toThrow();
        });
    });
});
