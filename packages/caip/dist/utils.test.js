"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assetId_1 = require("./assetId/assetId");
const constants_1 = require("./constants");
const typeGuards_1 = require("./typeGuards");
const utils_1 = require("./utils");
describe('accountIdToChainId', () => {
    it('can get eth chainId from accountId', () => {
        const accountId = 'eip155:1:0xdef1cafe';
        const chainId = (0, utils_1.accountIdToChainId)(accountId);
        expect(chainId).toEqual(constants_1.ethChainId);
    });
    it('can get btc chainId from accountId', () => {
        const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz';
        const chainId = (0, utils_1.accountIdToChainId)(accountId);
        expect(chainId).toEqual(constants_1.btcChainId);
    });
});
describe('accountIdToSpecifier', () => {
    it('can get eth address from accountId', () => {
        const address = '0xdef1cafe';
        const accountId = 'eip155:1:0xdef1cafe';
        const result = (0, utils_1.accountIdToSpecifier)(accountId);
        expect(result).toEqual(address);
    });
    it('can get xpub from accountId', () => {
        const xpub = 'xpubfoobarbaz';
        const accountId = 'bip122:000000000019d6689c085ae165831e93:xpubfoobarbaz';
        const result = (0, utils_1.accountIdToSpecifier)(accountId);
        expect(result).toEqual(xpub);
    });
});
describe('isValidChainPartsPair', () => {
    it('correctly validates pairs', () => {
        expect((0, utils_1.isValidChainPartsPair)(constants_1.CHAIN_NAMESPACE.Utxo, constants_1.CHAIN_REFERENCE.BitcoinTestnet)).toEqual(true);
        expect((0, utils_1.isValidChainPartsPair)(constants_1.CHAIN_NAMESPACE.Evm, constants_1.CHAIN_REFERENCE.BitcoinTestnet)).toEqual(false);
        expect((0, utils_1.isValidChainPartsPair)('invalid', constants_1.CHAIN_REFERENCE.BitcoinTestnet)).toEqual(false);
        expect((0, utils_1.isValidChainPartsPair)(constants_1.CHAIN_NAMESPACE.Evm, 'invalid')).toEqual(false);
    });
});
describe('type guard', () => {
    describe('isChainNamespace', () => {
        it('correctly determines type', () => {
            expect((0, typeGuards_1.isChainNamespace)(constants_1.CHAIN_NAMESPACE.Utxo)).toEqual(true);
            expect((0, typeGuards_1.isChainNamespace)(constants_1.CHAIN_NAMESPACE.Evm)).toEqual(true);
            expect((0, typeGuards_1.isChainNamespace)('invalid')).toEqual(false);
            expect((0, typeGuards_1.isChainNamespace)('')).toEqual(false);
        });
    });
    describe('isChainReference', () => {
        it('correctly determines type', () => {
            expect((0, typeGuards_1.isChainReference)(constants_1.CHAIN_REFERENCE.EthereumMainnet)).toEqual(true);
            expect((0, typeGuards_1.isChainReference)(constants_1.CHAIN_REFERENCE.BitcoinTestnet)).toEqual(true);
            expect((0, typeGuards_1.isChainReference)('invalid')).toEqual(false);
            expect((0, typeGuards_1.isChainReference)('')).toEqual(false);
        });
    });
    describe('isValidChainId', () => {
        it('correctly determines type', () => {
            expect((0, typeGuards_1.isChainId)(constants_1.ethChainId)).toEqual(true);
            expect((0, typeGuards_1.isChainId)(constants_1.btcChainId)).toEqual(true);
            expect((0, typeGuards_1.isChainId)(constants_1.cosmosChainId)).toEqual(true);
            expect((0, typeGuards_1.isChainId)('invalid')).toEqual(false);
            expect((0, typeGuards_1.isChainId)('')).toEqual(false);
        });
    });
    describe('isAssetNamespace', () => {
        it('correctly determines type', () => {
            expect((0, typeGuards_1.isAssetNamespace)(constants_1.ASSET_NAMESPACE.cw20)).toEqual(true);
            expect((0, typeGuards_1.isAssetNamespace)(constants_1.ASSET_NAMESPACE.cw721)).toEqual(true);
            expect((0, typeGuards_1.isAssetNamespace)('invalid')).toEqual(false);
            expect((0, typeGuards_1.isAssetNamespace)('')).toEqual(false);
        });
    });
    describe('isAssetReference', () => {
        it('correctly determines type', () => {
            expect((0, typeGuards_1.isAssetReference)(constants_1.ASSET_REFERENCE.Bitcoin)).toEqual(true);
            expect((0, typeGuards_1.isAssetReference)(constants_1.ASSET_REFERENCE.Ethereum)).toEqual(true);
            expect((0, typeGuards_1.isAssetReference)('invalid')).toEqual(false);
            expect((0, typeGuards_1.isAssetReference)('')).toEqual(false);
        });
    });
    describe('isAssetId', () => {
        it('correctly determines type', () => {
            expect((0, typeGuards_1.isAssetId)(constants_1.btcAssetId)).toEqual(true);
            expect((0, typeGuards_1.isAssetId)(constants_1.ethAssetId)).toEqual(true);
            expect((0, typeGuards_1.isAssetId)(constants_1.cosmosAssetId)).toEqual(true);
            expect((0, typeGuards_1.isAssetId)('invalid')).toEqual(false);
            expect((0, typeGuards_1.isAssetId)('')).toEqual(false);
        });
    });
});
describe('type guard assertion', () => {
    describe('assertIsChainId', () => {
        it('correctly asserts type', () => {
            expect(() => (0, typeGuards_1.assertIsChainId)(constants_1.ethChainId)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainId)(constants_1.btcChainId)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainId)(constants_1.cosmosChainId)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainId)('invalid')).toThrow();
            expect(() => (0, typeGuards_1.assertIsChainId)('')).toThrow();
        });
    });
    describe('assertIsChainNamespace', () => {
        it('correctly asserts type', () => {
            expect(() => (0, typeGuards_1.assertIsChainNamespace)(constants_1.CHAIN_NAMESPACE.Utxo)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainNamespace)(constants_1.CHAIN_NAMESPACE.Evm)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainNamespace)('invalid')).toThrow();
            expect(() => (0, typeGuards_1.assertIsChainNamespace)('')).toThrow();
        });
    });
    describe('assertIsChainReference', () => {
        it('correctly asserts type', () => {
            expect(() => (0, typeGuards_1.assertIsChainReference)(constants_1.CHAIN_REFERENCE.EthereumMainnet)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainReference)(constants_1.CHAIN_REFERENCE.BitcoinTestnet)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsChainReference)('invalid')).toThrow();
            expect(() => (0, typeGuards_1.assertIsChainReference)('')).toThrow();
        });
    });
    describe('assertIsAssetNamespace', () => {
        it('correctly asserts type', () => {
            expect(() => (0, typeGuards_1.assertIsAssetNamespace)(constants_1.ASSET_NAMESPACE.cw20)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsAssetNamespace)(constants_1.ASSET_NAMESPACE.cw721)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsAssetNamespace)('invalid')).toThrow();
            expect(() => (0, typeGuards_1.assertIsAssetNamespace)('')).toThrow();
        });
    });
    describe('assertIsAssetReference', () => {
        it('correctly asserts type', () => {
            expect(() => (0, typeGuards_1.assertIsAssetReference)(constants_1.ASSET_REFERENCE.Bitcoin)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsAssetReference)(constants_1.ASSET_REFERENCE.Ethereum)).not.toThrow();
            expect(() => (0, typeGuards_1.assertIsAssetReference)('invalid')).toThrow();
            expect(() => (0, typeGuards_1.assertIsAssetReference)('')).toThrow();
        });
    });
    describe('assertValidChainPartsPair', () => {
        it('correctly asserts type', () => {
            expect(() => (0, typeGuards_1.assertValidChainPartsPair)(constants_1.CHAIN_NAMESPACE.Utxo, constants_1.CHAIN_REFERENCE.BitcoinTestnet)).not.toThrow();
            expect(() => (0, typeGuards_1.assertValidChainPartsPair)(constants_1.CHAIN_NAMESPACE.Utxo, constants_1.CHAIN_REFERENCE.EthereumMainnet)).toThrow();
            expect(() => (0, typeGuards_1.assertValidChainPartsPair)('invalid', constants_1.CHAIN_REFERENCE.BitcoinTestnet)).toThrow();
            expect(() => (0, typeGuards_1.assertValidChainPartsPair)(constants_1.CHAIN_NAMESPACE.Evm, 'invalid')).toThrow();
        });
    });
    describe('generateAssetIdFromCosmosDenom', () => {
        it('correctly generates ATOM native asset id', () => {
            const nativeAssetId = (0, assetId_1.toAssetId)({
                assetNamespace: constants_1.ASSET_NAMESPACE.slip44,
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
                chainId: constants_1.cosmosChainId,
            });
            const result = (0, utils_1.generateAssetIdFromCosmosSdkDenom)('uatom', constants_1.cosmosAssetId);
            expect(result).toEqual(nativeAssetId);
        });
        it('correctly generates cosmoshub IBC asset id', () => {
            const ibcAssetId = (0, assetId_1.toAssetId)({
                assetNamespace: constants_1.ASSET_NAMESPACE.ibc,
                assetReference: '14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
                chainId: constants_1.cosmosChainId,
            });
            const result = (0, utils_1.generateAssetIdFromCosmosSdkDenom)('ibc/14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC', constants_1.cosmosAssetId);
            expect(result).toEqual(ibcAssetId);
        });
    });
});
