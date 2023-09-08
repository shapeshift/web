"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const typeGuards_1 = require("../typeGuards");
const chainId_1 = require("./chainId");
describe('chainId', () => {
    it('should have matching CAIP2 aliases', () => {
        expect(chainId_1.toChainId).toEqual(chainId_1.toCAIP2);
        expect(chainId_1.fromChainId).toEqual(chainId_1.fromCAIP2);
    });
    describe('toChainId', () => {
        it('can turn CosmosHub mainnet to ChainId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
            const result = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
            expect(result).toEqual('cosmos:cosmoshub-4');
        });
        it('can turn CosmosHub testnet to ChainId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubVega;
            const result = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
            expect(result).toEqual('cosmos:vega-testnet');
        });
        it('can turn Ethereum mainnet to ChainId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const result = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
            expect(result).toEqual('eip155:1');
        });
        it('can turn Ethereum testnet to ChainId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumRopsten;
            const result = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
            expect(result).toEqual('eip155:3');
        });
        it('can turn Bitcoin mainnet to ChainId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
            const result = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
            expect(result).toEqual('bip122:000000000019d6689c085ae165831e93');
        });
        it('can turn Bitcoin testnet to ChainId', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinTestnet;
            const result = (0, chainId_1.toChainId)({ chainNamespace, chainReference });
            expect(result).toEqual('bip122:000000000933ea01ad0ee984209779ba');
        });
        it('should throw an error for an invalid chain', () => {
            // @ts-ignore
            expect(() => (0, chainId_1.toChainId)({
                chainNamespace: constants_1.CHAIN_NAMESPACE.Utxo,
                chainReference: constants_1.CHAIN_REFERENCE.CosmosHubVega,
            })).toThrow('assertIsChainId: unsupported ChainId: bip122:vega-testnet');
        });
    });
    describe('fromChainId', () => {
        it('can turn Bitcoin mainnet to chain and network', () => {
            const bitcoinChainId = 'bip122:000000000019d6689c085ae165831e93';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(bitcoinChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Utxo);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.BitcoinMainnet);
        });
        it('can turn Bitcoin testnet to chain and network', () => {
            const bitcoinChainId = 'bip122:000000000933ea01ad0ee984209779ba';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(bitcoinChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Utxo);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.BitcoinTestnet);
        });
        it('can turn CosmosHub mainnet to chain and network', () => {
            const cosmosHubChainId = 'cosmos:cosmoshub-4';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(cosmosHubChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.CosmosSdk);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.CosmosHubMainnet);
        });
        it('can turn CosmosHub testnet to chain and network', () => {
            const cosmosHubChainId = 'cosmos:vega-testnet';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(cosmosHubChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.CosmosSdk);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.CosmosHubVega);
        });
        it('can turn Ethereum mainnet to chain and network', () => {
            const ethereumChainId = 'eip155:1';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(ethereumChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumMainnet);
        });
        it('can turn Ethereum ropsten to chain and network', () => {
            const ethereumChainId = 'eip155:3';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(ethereumChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumRopsten);
        });
        it('can turn Ethereum rinkeby to chain and network', () => {
            const ethereumChainId = 'eip155:4';
            const { chainNamespace, chainReference } = (0, chainId_1.fromChainId)(ethereumChainId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumRinkeby);
        });
    });
});
describe('isChainId', () => {
    it('throws on eip155 without a network reference', () => {
        expect(() => (0, typeGuards_1.assertIsChainId)('eip155')).toThrow();
    });
    it('validates eip155:1 mainnet as true', () => {
        expect((0, typeGuards_1.isChainId)('eip155:1')).toBe(true);
    });
    it('throws on eip155:2 unsupported network reference', () => {
        expect(() => (0, typeGuards_1.assertIsChainId)('eip155:2')).toThrow();
    });
    it('validates ethereum testnets as true', () => {
        expect((0, typeGuards_1.isChainId)('eip155:3')).toBe(true);
        expect((0, typeGuards_1.isChainId)('eip155:4')).toBe(true);
    });
    it('validates bip122:000000000019d6689c085ae165831e93 mainnet as true', () => {
        expect((0, typeGuards_1.isChainId)('bip122:000000000019d6689c085ae165831e93')).toBe(true);
    });
    it('validates bip122:000000000933ea01ad0ee984209779ba testnet as true', () => {
        expect((0, typeGuards_1.isChainId)('bip122:000000000933ea01ad0ee984209779ba')).toBe(true);
    });
    it('throws on bip122 with the wrong network reference', () => {
        expect(() => (0, typeGuards_1.assertIsChainId)('bip122:1')).toThrow();
    });
    it('throws on bip122', () => {
        // missing network
        expect(() => (0, typeGuards_1.assertIsChainId)('bip122')).toThrow();
    });
    it('throws on empty string', () => {
        // missing network
        expect(() => (0, typeGuards_1.assertIsChainId)('')).toThrow();
    });
    it('should return true for cosmos', () => {
        expect((0, typeGuards_1.isChainId)('cosmos:cosmoshub-4')).toBe(true);
        expect((0, typeGuards_1.isChainId)('cosmos:vega-testnet')).toBe(true);
    });
    it('should throw for an unknown cosmos chain', () => {
        expect(() => (0, typeGuards_1.assertIsChainId)('cosmos:fakechain-1')).toThrow('assertIsChainId: unsupported ChainId: cosmos:fakechain-1');
    });
});
