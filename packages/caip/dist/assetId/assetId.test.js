"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const chainId_1 = require("../chainId/chainId");
const constants_1 = require("../constants");
const assetId_1 = require("./assetId");
describe('assetId', () => {
    it('should have matching CAIP19 aliases', () => {
        expect(assetId_1.toAssetId).toEqual(assetId_1.toCAIP19);
        expect(assetId_1.fromAssetId).toEqual(assetId_1.fromCAIP19);
    });
    describe('toAssetId', () => {
        describe('toAssetId(fromAssetId())', () => {
            it.each([
                ['eip155:1/slip44:60'],
                ['eip155:3/slip44:60'],
                ['eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'],
                ['bip122:000000000019d6689c085ae165831e93/slip44:0'],
                ['bip122:000000000933ea01ad0ee984209779ba/slip44:0'],
                ['cosmos:cosmoshub-4/slip44:118'],
                ['cosmos:vega-testnet/slip44:118'],
            ])('returns an AssetId from the result of fromAssetId for %s', assetId => {
                const result = (0, assetId_1.fromAssetId)(assetId);
                expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(result, 'chainId'))).toBe(assetId);
                expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(result, ['chainNamespace', 'chainReference']))).toBe(assetId);
            });
        });
        it('can make eth AssetId on mainnet', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
                chainId: (0, chainId_1.toChainId)({ chainNamespace, chainReference }),
            };
            const expected = 'eip155:1/slip44:60';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('can make eth AssetId on ropsten', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumRopsten;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
                chainId: (0, chainId_1.toChainId)({ chainNamespace, chainReference }),
            };
            const expected = 'eip155:3/slip44:60';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('throws with invalid eth network', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubVega;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('throws with invalid namespace', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'cw721',
                assetReference: constants_1.ASSET_REFERENCE.Ethereum,
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('can make Cosmos AssetId on CosmosHub mainnet', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
                chainId: (0, chainId_1.toChainId)({ chainNamespace, chainReference }),
            };
            const expected = 'cosmos:cosmoshub-4/slip44:118';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('can make Cosmos AssetId on CosmosHub vega', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubVega;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
                chainId: (0, chainId_1.toChainId)({ chainNamespace, chainReference }),
            };
            const expected = 'cosmos:vega-testnet/slip44:118';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('can make an IBC AssetId on CosmosHub', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'ibc',
                assetReference: '14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC',
                chainId: (0, chainId_1.toChainId)({ chainNamespace, chainReference }),
            };
            const expected = 'cosmos:cosmoshub-4/ibc:14F9BC3E44B8A9C1BE1FB08980FAB87034C9905EF17CF2F5008FC085218811CC';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('throws with invalid Cosmos network', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinTestnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Cosmos,
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('throws with invalid Cosmos slip44 reference', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.CosmosSdk;
            const chainReference = constants_1.CHAIN_REFERENCE.CosmosHubMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: 'bad',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('throws with invalid btc network', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumRopsten;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('can make FOX AssetId on mainnet', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc20',
                assetReference: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            const expected = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('should lower case ERC20 asset references', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc20',
                assetReference: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            const expected = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('should lower case ERC721 asset references', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc721',
                assetReference: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d/12345',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            const expected = 'eip155:1/erc721:0xc770eefad204b5180df6a14ee197d99d808ee52d/12345';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('can make FOX AssetId on ropsten', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumRopsten;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc20',
                assetReference: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            const expected = 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('throws with invalid assetReference length', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc20',
                assetReference: '0xfoo',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('throws with no assetReference string', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc20',
                assetReference: '',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('throws with invalid assetReference string', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'erc20',
                assetReference: 'gm',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('throws if no asset namespace provided', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Evm;
            const chainReference = constants_1.CHAIN_REFERENCE.EthereumMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: '',
                assetReference: '0xdef1cafe',
                chainId: `${chainNamespace}:${chainReference}`,
            };
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toThrow();
            expect(() => (0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toThrow();
        });
        it('can make bitcoin AssetId on mainnet', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinMainnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
                chainId: `${chainNamespace}:${chainReference}`,
            };
            const expected = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
        it('can make bitcoin AssetId on testnet', () => {
            const chainNamespace = constants_1.CHAIN_NAMESPACE.Utxo;
            const chainReference = constants_1.CHAIN_REFERENCE.BitcoinTestnet;
            const assetIdArgSuperset = {
                chainNamespace,
                chainReference,
                assetNamespace: 'slip44',
                assetReference: constants_1.ASSET_REFERENCE.Bitcoin,
                chainId: `${chainNamespace}:${chainReference}`,
            };
            const expected = 'bip122:000000000933ea01ad0ee984209779ba/slip44:0';
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, 'chainId'))).toEqual(expected);
            expect((0, assetId_1.toAssetId)((0, lodash_1.omit)(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(expected);
        });
    });
    describe('fromAssetId', () => {
        describe('fromAssetId(toAssetId())', () => {
            const slip44 = 'slip44';
            const erc20 = 'erc20';
            it.each([
                [constants_1.CHAIN_NAMESPACE.Utxo, constants_1.CHAIN_REFERENCE.BitcoinMainnet, slip44, constants_1.ASSET_REFERENCE.Bitcoin],
                [constants_1.CHAIN_NAMESPACE.Utxo, constants_1.CHAIN_REFERENCE.BitcoinTestnet, slip44, constants_1.ASSET_REFERENCE.Bitcoin],
                [constants_1.CHAIN_NAMESPACE.Evm, constants_1.CHAIN_REFERENCE.EthereumMainnet, slip44, constants_1.ASSET_REFERENCE.Ethereum],
                [constants_1.CHAIN_NAMESPACE.Evm, constants_1.CHAIN_REFERENCE.EthereumRopsten, slip44, constants_1.ASSET_REFERENCE.Ethereum],
                [
                    constants_1.CHAIN_NAMESPACE.Evm,
                    constants_1.CHAIN_REFERENCE.EthereumMainnet,
                    erc20,
                    '0xc770eefad204b5180df6a14ee197d99d808ee52d',
                ],
                [
                    constants_1.CHAIN_NAMESPACE.CosmosSdk,
                    constants_1.CHAIN_REFERENCE.CosmosHubMainnet,
                    slip44,
                    constants_1.ASSET_REFERENCE.Cosmos,
                ],
                [constants_1.CHAIN_NAMESPACE.CosmosSdk, constants_1.CHAIN_REFERENCE.CosmosHubVega, slip44, constants_1.ASSET_REFERENCE.Cosmos],
            ])('returns a AssetId from the result of fromAssetId for %s', (chainNamespace, chainReference, assetNamespace, assetReference) => {
                expect((0, assetId_1.fromAssetId)((0, assetId_1.toAssetId)({ chainNamespace, chainReference, assetNamespace, assetReference }))).toStrictEqual({
                    chainNamespace,
                    chainReference,
                    assetReference,
                    assetNamespace,
                    chainId: (0, chainId_1.toChainId)({ chainNamespace, chainReference }),
                });
            });
        });
        it('can return chain, network from eth AssetId on mainnet', () => {
            const AssetId = 'eip155:1/slip44:60';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumMainnet);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('slip44');
            expect(assetReference).toEqual(constants_1.ASSET_REFERENCE.Ethereum);
        });
        it('can return chain, network from eth AssetId on ropsten', () => {
            const AssetId = 'eip155:3/slip44:60';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumRopsten);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('slip44');
            expect(assetReference).toEqual(constants_1.ASSET_REFERENCE.Ethereum);
        });
        it('can return chain, network from bitcoin AssetId on mainnet', () => {
            const AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Utxo);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.BitcoinMainnet);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('slip44');
            expect(assetReference).toEqual(constants_1.ASSET_REFERENCE.Bitcoin);
        });
        it('can return chain, network from bitcoin AssetId on testnet', () => {
            const AssetId = 'bip122:000000000933ea01ad0ee984209779ba/slip44:0';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Utxo);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.BitcoinTestnet);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('slip44');
            expect(assetReference).toEqual(constants_1.ASSET_REFERENCE.Bitcoin);
        });
        it('can return chainId, chainReference, chainNamespace, assetNamespace, assetReference from FOX AssetId on mainnet', () => {
            const AssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumMainnet);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('erc20');
            expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d');
        });
        it('should lower case assetReference for assetNamespace ERC20', () => {
            const AssetId = 'eip155:3/erc20:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumRopsten);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('erc20');
            expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d');
        });
        it('should lower case assetReference for assetNamespace ERC721', () => {
            const AssetId = 'eip155:3/erc721:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d/12345';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumRopsten);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('erc721');
            const [address, id] = assetReference.split('/');
            expect(address).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d');
            expect(id).toEqual('12345');
        });
        it('can return chainId, chainReference, chainNamespace, assetNamespace, assetReference from FOX AssetId on ropsten', () => {
            const AssetId = 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.Evm);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.EthereumRopsten);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('erc20');
            expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d');
        });
        it('can parse a cosmoshub native token', () => {
            const AssetId = 'cosmos:cosmoshub-4/slip44:118';
            const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } = (0, assetId_1.fromAssetId)(AssetId);
            expect(chainNamespace).toEqual(constants_1.CHAIN_NAMESPACE.CosmosSdk);
            expect(chainReference).toEqual(constants_1.CHAIN_REFERENCE.CosmosHubMainnet);
            expect(chainId).toEqual((0, chainId_1.toChainId)({ chainNamespace, chainReference }));
            expect(assetNamespace).toEqual('slip44');
            expect(assetReference).toEqual(constants_1.ASSET_REFERENCE.Cosmos);
        });
        it('errors for an invalid AssetId format', () => {
            expect(() => (0, assetId_1.fromAssetId)('invalid')).toThrow();
        });
        it('errors for invalid ChainNamespace', () => {
            expect(() => (0, assetId_1.fromAssetId)('invalid:cosmoshub-4/slip44:118')).toThrow();
        });
        it('errors for invalid ChainReference type', () => {
            expect(() => (0, assetId_1.fromAssetId)('cosmos:invalid/slip44:118')).toThrow();
        });
    });
});
