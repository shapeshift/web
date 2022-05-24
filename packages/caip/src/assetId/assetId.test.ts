import { omit } from 'lodash'

import { ChainNamespace, ChainReference, toChainId } from '../chainId/chainId'
import { ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../constants'
import {
  AssetNamespace,
  AssetReference,
  fromAssetId,
  fromCAIP19,
  toAssetId,
  toCAIP19
} from './assetId'

describe('assetId', () => {
  it('should have matching CAIP19 aliases', () => {
    expect(toAssetId).toEqual(toCAIP19)
    expect(fromAssetId).toEqual(fromCAIP19)
  })
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
        ['cosmos:osmosis-1/slip44:118'],
        ['cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'],
        ['cosmos:osmo-testnet-1/slip44:118']
      ])('returns an AssetId from the result of fromAssetId for %s', (assetId) => {
        const result = fromAssetId(assetId)
        expect(toAssetId(omit(result, 'chainId'))).toBe(assetId)
        expect(toAssetId(omit(result, ['chainNamespace', 'chainReference']))).toBe(assetId)
      })
    })

    it('can make eth AssetId on mainnet', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Ethereum,
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'eip155:1/slip44:60'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can make eth AssetId on ropsten', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumRopsten
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Ethereum,
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'eip155:3/slip44:60'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('throws with invalid eth network', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.CosmosHubVega
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Ethereum,
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('throws with invalid namespace', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'cw721' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Ethereum,
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('can make Cosmos AssetId on CosmosHub mainnet', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Cosmos,
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'cosmos:cosmoshub-4/slip44:118'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can make Osmosis AssetId on Osmosis mainnet with slip44 reference', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Cosmos,
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'cosmos:osmosis-1/slip44:118'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can return ibc AssetId for osmosis', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'ibc' as AssetNamespace,
        assetReference: '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593',
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected =
        'cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can return native AssetId for osmosis', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'native' as AssetNamespace,
        assetReference: 'uion',
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'cosmos:osmosis-1/native:uion'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can return cw20 AssetId for osmosis', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'cw20' as AssetNamespace,
        assetReference: 'canlab',
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'cosmos:osmosis-1/cw20:canlab'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can return cw721 AssetId for osmosis', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'cw721' as AssetNamespace,
        assetReference: 'osmosiskitty',
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'cosmos:osmosis-1/cw721:osmosiskitty'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can make Cosmos AssetId on CosmosHub vega', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.CosmosHubVega
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Cosmos,
        chainId: toChainId({ chainNamespace, chainReference })
      }
      const expected = 'cosmos:vega-testnet/slip44:118'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('throws with invalid Cosmos network', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.BitcoinTestnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Cosmos,
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('throws with invalid Cosmos slip44 reference', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: 'bad',
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('throws with invalid btc network', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.EthereumRopsten
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Bitcoin,
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('can make FOX AssetId on mainnet', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc20' as AssetNamespace,
        assetReference: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        chainId: `${chainNamespace}:${chainReference}`
      }
      const expected = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('should lower case ERC20 asset references', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc20' as AssetNamespace,
        assetReference: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        chainId: `${chainNamespace}:${chainReference}`
      }
      const expected = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('should lower case ERC721 asset references', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc721' as AssetNamespace,
        assetReference: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        chainId: `${chainNamespace}:${chainReference}`
      }
      const expected = 'eip155:1/erc721:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can make FOX AssetId on ropsten', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumRopsten
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc20' as AssetNamespace,
        assetReference: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
        chainId: `${chainNamespace}:${chainReference}`
      }
      const expected = 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('throws with invalid assetReference length', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc20' as AssetNamespace,
        assetReference: '0xfoo',
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('throws with no assetReference string', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc20' as AssetNamespace,
        assetReference: '',
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('throws with invalid assetReference string', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'erc20' as AssetNamespace,
        assetReference: 'gm',
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('throws if no asset namespace provided', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: '' as AssetNamespace,
        assetReference: '0xdef1cafe',
        chainId: `${chainNamespace}:${chainReference}`
      }
      expect(() => toAssetId(omit(assetIdArgSuperset, 'chainId'))).toThrow()
      expect(() =>
        toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))
      ).toThrow()
    })

    it('can make bitcoin AssetId on mainnet', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Bitcoin,
        chainId: `${chainNamespace}:${chainReference}`
      }
      const expected = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })

    it('can make bitcoin AssetId on testnet', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.BitcoinTestnet
      const assetIdArgSuperset = {
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44' as AssetNamespace,
        assetReference: ASSET_REFERENCE.Bitcoin,
        chainId: `${chainNamespace}:${chainReference}`
      }
      const expected = 'bip122:000000000933ea01ad0ee984209779ba/slip44:0'
      expect(toAssetId(omit(assetIdArgSuperset, 'chainId'))).toEqual(expected)
      expect(toAssetId(omit(assetIdArgSuperset, ['chainNamespace', 'chainReference']))).toEqual(
        expected
      )
    })
  })

  describe('fromAssetId', () => {
    describe('fromAssetId(toAssetId())', () => {
      const slip44: AssetNamespace = 'slip44'
      const erc20: AssetNamespace = 'erc20'
      const ibc: AssetNamespace = 'ibc'
      const native: AssetNamespace = 'native'
      it.each([
        [CHAIN_NAMESPACE.Bitcoin, CHAIN_REFERENCE.BitcoinMainnet, slip44, ASSET_REFERENCE.Bitcoin],
        [CHAIN_NAMESPACE.Bitcoin, CHAIN_REFERENCE.BitcoinTestnet, slip44, ASSET_REFERENCE.Bitcoin],
        [
          CHAIN_NAMESPACE.Ethereum,
          CHAIN_REFERENCE.EthereumMainnet,
          slip44,
          ASSET_REFERENCE.Ethereum
        ],
        [
          CHAIN_NAMESPACE.Ethereum,
          CHAIN_REFERENCE.EthereumRopsten,
          slip44,
          ASSET_REFERENCE.Ethereum
        ],
        [
          CHAIN_NAMESPACE.Ethereum,
          CHAIN_REFERENCE.EthereumMainnet,
          erc20,
          '0xc770eefad204b5180df6a14ee197d99d808ee52d'
        ],
        [CHAIN_NAMESPACE.Cosmos, CHAIN_REFERENCE.CosmosHubMainnet, slip44, ASSET_REFERENCE.Cosmos],
        [CHAIN_NAMESPACE.Cosmos, CHAIN_REFERENCE.CosmosHubVega, slip44, ASSET_REFERENCE.Cosmos],
        [CHAIN_NAMESPACE.Cosmos, CHAIN_REFERENCE.OsmosisMainnet, slip44, ASSET_REFERENCE.Osmosis],
        [CHAIN_NAMESPACE.Cosmos, CHAIN_REFERENCE.OsmosisTestnet, slip44, ASSET_REFERENCE.Osmosis],
        [
          CHAIN_NAMESPACE.Cosmos,
          CHAIN_REFERENCE.OsmosisMainnet,
          ibc,
          '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
        ],
        [CHAIN_NAMESPACE.Cosmos, CHAIN_REFERENCE.OsmosisMainnet, native, 'uion']
      ])(
        'returns a AssetId from the result of fromAssetId for %s',
        (
          chainNamespace: ChainNamespace,
          chainReference: ChainReference,
          assetNamespace: AssetNamespace,
          assetReference: AssetReference | string
        ) => {
          expect(
            fromAssetId(
              toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
            )
          ).toStrictEqual({
            chainNamespace,
            chainReference,
            assetReference,
            assetNamespace,
            chainId: toChainId({ chainNamespace, chainReference })
          })
        }
      )
    })

    it('can return chain, network from eth AssetId on mainnet', () => {
      const AssetId = 'eip155:1/slip44:60'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Ethereum)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('slip44')
      expect(assetReference).toEqual(ASSET_REFERENCE.Ethereum)
    })

    it('can return chain, network from eth AssetId on ropsten', () => {
      const AssetId = 'eip155:3/slip44:60'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Ethereum)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumRopsten)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('slip44')
      expect(assetReference).toEqual(ASSET_REFERENCE.Ethereum)
    })

    it('can return chain, network from bitcoin AssetId on mainnet', () => {
      const AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Bitcoin)
      expect(chainReference).toEqual(CHAIN_REFERENCE.BitcoinMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('slip44')
      expect(assetReference).toEqual(ASSET_REFERENCE.Bitcoin)
    })

    it('can return chain, network from bitcoin AssetId on testnet', () => {
      const AssetId = 'bip122:000000000933ea01ad0ee984209779ba/slip44:0'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Bitcoin)
      expect(chainReference).toEqual(CHAIN_REFERENCE.BitcoinTestnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('slip44')
      expect(assetReference).toEqual(ASSET_REFERENCE.Bitcoin)
    })

    it('can return chainId, chainReference, chainNamespace, assetNamespace, assetReference from FOX AssetId on mainnet', () => {
      const AssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Ethereum)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('erc20')
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('should lower case assetReference for assetNamespace ERC20', () => {
      const AssetId = 'eip155:3/erc20:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Ethereum)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumRopsten)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('erc20')
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('should lower case assetReference for assetNamespace ERC721', () => {
      const AssetId = 'eip155:3/erc721:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Ethereum)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumRopsten)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('erc721')
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can return chainId, chainReference, chainNamespace, assetNamespace, assetReference from FOX AssetId on ropsten', () => {
      const AssetId = 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Ethereum)
      expect(chainReference).toEqual(CHAIN_REFERENCE.EthereumRopsten)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('erc20')
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can parse a cosmoshub native token', () => {
      const AssetId = 'cosmos:cosmoshub-4/slip44:118'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Cosmos)
      expect(chainReference).toEqual(CHAIN_REFERENCE.CosmosHubMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('slip44')
      expect(assetReference).toEqual(ASSET_REFERENCE.Cosmos)
    })

    it('can parse an osmosis native token', () => {
      const AssetId = 'cosmos:osmosis-1/slip44:118'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Cosmos)
      expect(chainReference).toEqual(CHAIN_REFERENCE.OsmosisMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('slip44')
      expect(assetReference).toEqual(ASSET_REFERENCE.Osmosis)
    })

    it('can parse an osmosis ibc token', () => {
      const AssetId =
        'cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Cosmos)
      expect(chainReference).toEqual(CHAIN_REFERENCE.OsmosisMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('ibc')
      expect(assetReference).toEqual(
        '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      )
    })

    it('can parse an osmosis cw20 token', () => {
      const AssetId = 'cosmos:osmosis-1/cw20:canlab'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Cosmos)
      expect(chainReference).toEqual(CHAIN_REFERENCE.OsmosisMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('cw20')
      expect(assetReference).toEqual('canlab')
    })

    it('can parse an osmosis cw721 token', () => {
      const AssetId = 'cosmos:osmosis-1/cw721:osmokitty'
      const { chainId, chainReference, chainNamespace, assetNamespace, assetReference } =
        fromAssetId(AssetId)
      expect(chainNamespace).toEqual(CHAIN_NAMESPACE.Cosmos)
      expect(chainReference).toEqual(CHAIN_REFERENCE.OsmosisMainnet)
      expect(chainId).toEqual(toChainId({ chainNamespace, chainReference }))
      expect(assetNamespace).toEqual('cw721')
      expect(assetReference).toEqual('osmokitty')
    })

    it('errors for an invalid AssetId format', () => {
      expect(() => fromAssetId('invalid')).toThrow()
    })

    it('errors for invalid chaintype', () => {
      expect(() => fromAssetId('invalid:cosmoshub-4/slip44:118')).toThrow()
    })

    it('errors for invalid network type', () => {
      expect(() => fromAssetId('cosmos:invalid/slip44:118')).toThrow()
    })
    it('errors for invalid osmosis asset namespace', () => {
      expect(() => fromAssetId('cosmos:osmosis-1/invalid:118')).toThrow()
    })
  })
})
