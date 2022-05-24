import { toAssetId } from '../../assetId/assetId'
import { ASSET_REFERENCE, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'
import { assetIdToCoinCap, coincapToAssetId } from '.'

describe('adapters:coincap', () => {
  describe('coincapToAssetId', () => {
    it('can get AssetId for bitcoin', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin
      })
      expect(coincapToAssetId('bitcoin')).toEqual(assetId)
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
      expect(coincapToAssetId('ethereum')).toEqual(assetId)
    })

    it('can get AssetId id for FOX', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(coincapToAssetId('fox-token')).toEqual(assetId)
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
    expect(coincapToAssetId('cosmos')).toEqual(assetId)
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
    expect(coincapToAssetId('osmosis')).toEqual(assetId)
  })

  describe('assetIdToCoinCap', () => {
    it('can get coincap id for bitcoin AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Bitcoin
      const chainReference = CHAIN_REFERENCE.BitcoinMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin
      })
      expect(assetIdToCoinCap(assetId)).toEqual('bitcoin')
    })

    it('can get coincap id for ethereum AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum
      })
      expect(assetIdToCoinCap(assetId)).toEqual('ethereum')
    })

    it('can get coincap id for FOX', () => {
      const chainNamespace = CHAIN_NAMESPACE.Ethereum
      const chainReference = CHAIN_REFERENCE.EthereumMainnet
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chainNamespace, chainReference, assetNamespace, assetReference })
      expect(assetIdToCoinCap(assetId)).toEqual('fox-token')
    })

    it('can get coincap id for cosmos AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.CosmosHubMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Cosmos
      })
      expect(assetIdToCoinCap(assetId)).toEqual('cosmos')
    })

    it('can get coincap id for osmosis AssetId', () => {
      const chainNamespace = CHAIN_NAMESPACE.Cosmos
      const chainReference = CHAIN_REFERENCE.OsmosisMainnet
      const assetId = toAssetId({
        chainNamespace,
        chainReference,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Osmosis
      })
      expect(assetIdToCoinCap(assetId)).toEqual('osmosis')
    })
  })
})
