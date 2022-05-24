import { toAssetId } from '../../assetId/assetId'
import { ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import { assetIdToCoingecko, coingeckoToAssetId } from '.'

describe('adapters:coingecko', () => {
  describe('coingeckoToAssetId', () => {
    it('can get AssetId for bitcoin', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet

      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin
      })
      expect(coingeckoToAssetId('bitcoin')).toEqual(assetId)
    })

    it('can get AssetId id for ethereum', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum
      })
      expect(coingeckoToAssetId('ethereum')).toEqual(assetId)
    })

    it('can get AssetId id for FOX', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(coingeckoToAssetId('shapeshift-fox-token')).toEqual(assetId)
    })
  })

  it('can get AssetId for cosmos', () => {
    const chainNamespace = CHAIN_NAMESPACE.Cosmos
    const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
    const assetId = toAssetId({
      chainNamespace,
      chainReference,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Cosmos
    })
    expect(coingeckoToAssetId('cosmos')).toEqual(assetId)
  })

  it('can get AssetId for osmosis', () => {
    const chainNamespace = CHAIN_NAMESPACE.Cosmos
    const chainReference = CHAIN_REFERENCE.OsmosisMainnet
    const assetId = toAssetId({
      chainNamespace,
      chainReference,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Osmosis
    })
    expect(coingeckoToAssetId('osmosis')).toEqual(assetId)
  })

  describe('AssetIdtoCoingecko', () => {
    it('can get coingecko id for bitcoin AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin
      })
      expect(assetIdToCoingecko(assetId)).toEqual('bitcoin')
    })

    it('can get coingecko id for ethereum AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum
      })
      expect(assetIdToCoingecko(assetId)).toEqual('ethereum')
    })

    it('can get coingecko id for FOX', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(assetIdToCoingecko(assetId)).toEqual('shapeshift-fox-token')
    })

    it('can get coingecko id for cosmos AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Cosmos
      })
      expect(assetIdToCoingecko(assetId)).toEqual('cosmos')
    })

    it('can get coingecko id for osmosis AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Osmosis
      })
      expect(assetIdToCoingecko(assetId)).toEqual('osmosis')
    })
  })
})
