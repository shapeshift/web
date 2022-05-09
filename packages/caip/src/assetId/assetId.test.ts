import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { AssetNamespace, AssetReference, fromAssetId, toAssetId } from './assetId'

describe('assetId', () => {
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
        expect(toAssetId(fromAssetId(assetId))).toBe(assetId)
      })
    })

    it('can make eth AssetId on mainnet', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Ethereum
      })
      expect(result).toEqual('eip155:1/slip44:60')
    })

    it('can make eth AssetId on ropsten', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.ETH_ROPSTEN
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Ethereum
      })
      expect(result).toEqual('eip155:3/slip44:60')
    })

    it('throws with invalid eth network', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.TESTNET
      expect(() =>
        toAssetId({
          chain,
          network,
          assetNamespace: AssetNamespace.Slip44,
          assetReference: AssetReference.Ethereum
        })
      ).toThrow()
    })

    it('can make Cosmos AssetId on CosmosHub mainnet', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Cosmos
      })
      expect(result).toEqual('cosmos:cosmoshub-4/slip44:118')
    })

    it('can make Cosmos AssetId on CosmosHub mainnet with slip44 reference', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: '118'
      })
      expect(result).toEqual('cosmos:cosmoshub-4/slip44:118')
    })

    it('can make Osmosis AssetId on Osmosis mainnet with slip44 reference', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: '118'
      })
      expect(result).toEqual('cosmos:osmosis-1/slip44:118')
    })

    it('can return ibc AssetId for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.IBC
      const assetReference = '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual(
        'cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      )
    })

    it('can return native AssetId for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.NATIVE
      const assetReference = 'uion'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('cosmos:osmosis-1/native:uion')
    })

    it('can return cw20 AssetId for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.CW20
      const assetReference = 'canlab'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('cosmos:osmosis-1/cw20:canlab')
    })

    it('can return cw721 AssetId for osmosis', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetNamespace = AssetNamespace.CW721
      const assetReference = 'osmosiskitty'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('cosmos:osmosis-1/cw721:osmosiskitty')
    })

    it('can make Cosmos AssetId on CosmosHub vega', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_VEGA
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Cosmos
      })
      expect(result).toEqual('cosmos:vega-testnet/slip44:118')
    })

    it('throws with invalid Cosmos network', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.TESTNET
      expect(() =>
        toAssetId({
          chain,
          network,
          assetNamespace: AssetNamespace.Slip44,
          assetReference: AssetReference.Cosmos
        })
      ).toThrow()
    })

    it('throws with invalid Cosmos slip44 reference', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const assetNamespace = AssetNamespace.Slip44
      expect(() => toAssetId({ chain, network, assetNamespace, assetReference: 'bad' })).toThrow()
    })

    it('throws with invalid btc network', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.ETH_ROPSTEN
      expect(() =>
        toAssetId({
          chain,
          network,
          assetNamespace: AssetNamespace.Slip44,
          assetReference: AssetReference.Bitcoin
        })
      ).toThrow()
    })

    it('can make FOX AssetId on mainnet', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('should lower case ERC20 asset references', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('should lower case ERC721 asset references', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC721
      const assetReference = '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('eip155:1/erc721:0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can make FOX AssetId on ropsten', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.ETH_ROPSTEN
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const result = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(result).toEqual('eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('throws with invalid assetReference length', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xfoo'
      expect(() => toAssetId({ chain, network, assetNamespace, assetReference })).toThrow()
    })

    it('throws with no assetReference string', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = ''
      expect(() => toAssetId({ chain, network, assetNamespace, assetReference })).toThrow()
    })

    it('throws with invalid assetReference string', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = 'gm'
      expect(() => toAssetId({ chain, network, assetNamespace, assetReference })).toThrow()
    })

    it('throws if no asset namespace provided', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetReference = '0xdef1cafe'
      const assetNamespace = '' as AssetNamespace
      expect(() => toAssetId({ chain, network, assetNamespace, assetReference })).toThrow()
    })

    it('can make bitcoin AssetId on mainnet', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Bitcoin
      })
      expect(result).toEqual('bip122:000000000019d6689c085ae165831e93/slip44:0')
    })

    it('can make bitcoin AssetId on testnet', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.TESTNET
      const result = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Bitcoin
      })
      expect(result).toEqual('bip122:000000000933ea01ad0ee984209779ba/slip44:0')
    })
  })

  describe('fromAssetId', () => {
    describe('fromAssetId(toAssetId())', () => {
      it.each([
        [ChainTypes.Bitcoin, NetworkTypes.MAINNET, AssetNamespace.Slip44, AssetReference.Bitcoin],
        [ChainTypes.Bitcoin, NetworkTypes.TESTNET, AssetNamespace.Slip44, AssetReference.Bitcoin],
        [ChainTypes.Ethereum, NetworkTypes.MAINNET, AssetNamespace.Slip44, AssetReference.Ethereum],
        [
          ChainTypes.Ethereum,
          NetworkTypes.ETH_ROPSTEN,
          AssetNamespace.Slip44,
          AssetReference.Ethereum
        ],
        [
          ChainTypes.Ethereum,
          NetworkTypes.MAINNET,
          AssetNamespace.ERC20,
          '0xc770eefad204b5180df6a14ee197d99d808ee52d'
        ],
        [
          ChainTypes.Cosmos,
          NetworkTypes.COSMOSHUB_MAINNET,
          AssetNamespace.Slip44,
          AssetReference.Cosmos
        ],
        [
          ChainTypes.Cosmos,
          NetworkTypes.COSMOSHUB_VEGA,
          AssetNamespace.Slip44,
          AssetReference.Cosmos
        ],
        [
          ChainTypes.Osmosis,
          NetworkTypes.OSMOSIS_MAINNET,
          AssetNamespace.Slip44,
          AssetReference.Osmosis
        ],
        [
          ChainTypes.Osmosis,
          NetworkTypes.OSMOSIS_TESTNET,
          AssetNamespace.Slip44,
          AssetReference.Osmosis
        ],
        [
          ChainTypes.Osmosis,
          NetworkTypes.OSMOSIS_MAINNET,
          AssetNamespace.IBC,
          '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
        ],
        [ChainTypes.Osmosis, NetworkTypes.OSMOSIS_MAINNET, AssetNamespace.NATIVE, 'uion']
      ])(
        'returns a AssetId from the result of fromAssetId for %s',
        (
          chain: ChainTypes,
          network: NetworkTypes,
          assetNamespace: AssetNamespace,
          assetReference: AssetReference | string
        ) => {
          expect(
            fromAssetId(toAssetId({ chain, network, assetNamespace, assetReference }))
          ).toStrictEqual({ chain, network, assetReference, assetNamespace })
        }
      )
    })

    it('can return chain, network from eth AssetId on mainnet', () => {
      const AssetId = 'eip155:1/slip44:60'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.Slip44)
      expect(assetReference).toEqual(AssetReference.Ethereum)
    })

    it('can return chain, network from eth AssetId on ropsten', () => {
      const AssetId = 'eip155:3/slip44:60'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
      expect(assetNamespace).toEqual(AssetNamespace.Slip44)
      expect(assetReference).toEqual(AssetReference.Ethereum)
    })

    it('can return chain, network from bitcoin AssetId on mainnet', () => {
      const AssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.Slip44)
      expect(assetReference).toEqual(AssetReference.Bitcoin)
    })

    it('can return chain, network from bitcoin AssetId on testnet', () => {
      const AssetId = 'bip122:000000000933ea01ad0ee984209779ba/slip44:0'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Bitcoin)
      expect(network).toEqual(NetworkTypes.TESTNET)
      expect(assetNamespace).toEqual(AssetNamespace.Slip44)
      expect(assetReference).toEqual(AssetReference.Bitcoin)
    })

    it('can return chain, network, assetNamespace, assetReference from FOX AssetId on mainnet', () => {
      const AssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.ERC20)
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('should lower case assetReference for assetNamespace ERC20', () => {
      const AssetId = 'eip155:3/erc20:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
      expect(assetNamespace).toEqual(AssetNamespace.ERC20)
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('should lower case assetReference for assetNamespace ERC721', () => {
      const AssetId = 'eip155:3/erc721:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
      expect(assetNamespace).toEqual(AssetNamespace.ERC721)
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can return chain, network, assetNamespace, assetReference from FOX AssetId on ropsten', () => {
      const AssetId = 'eip155:3/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Ethereum)
      expect(network).toEqual(NetworkTypes.ETH_ROPSTEN)
      expect(assetNamespace).toEqual(AssetNamespace.ERC20)
      expect(assetReference).toEqual('0xc770eefad204b5180df6a14ee197d99d808ee52d')
    })

    it('can parse a cosmoshub native token', () => {
      const AssetId = 'cosmos:cosmoshub-4/slip44:118'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Cosmos)
      expect(network).toEqual(NetworkTypes.COSMOSHUB_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.Slip44)
      expect(assetReference).toEqual(AssetReference.Cosmos)
    })

    it('can parse an osmosis native token', () => {
      const AssetId = 'cosmos:osmosis-1/slip44:118'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.Slip44)
      expect(assetReference).toEqual(AssetReference.Osmosis)
    })

    it('can parse an osmosis ibc token', () => {
      const AssetId =
        'cosmos:osmosis-1/ibc:346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.IBC)
      expect(assetReference).toEqual(
        '346786EA82F41FE55FAD14BF69AD8BA9B36985406E43F3CB23E6C45A285A9593'
      )
    })

    it('can parse an osmosis cw20 token', () => {
      const AssetId = 'cosmos:osmosis-1/cw20:canlab'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.CW20)
      expect(assetReference).toEqual('canlab')
    })

    it('can parse an osmosis cw721 token', () => {
      const AssetId = 'cosmos:osmosis-1/cw721:osmokitty'
      const { chain, network, assetNamespace, assetReference } = fromAssetId(AssetId)
      expect(chain).toEqual(ChainTypes.Osmosis)
      expect(network).toEqual(NetworkTypes.OSMOSIS_MAINNET)
      expect(assetNamespace).toEqual(AssetNamespace.CW721)
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
