import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { ASSET_REFERENCE, toAssetId } from '../../assetId/assetId'
import { assetIdToCoinCap, coincapToAssetId } from '.'

describe('adapters:coincap', () => {
  describe('coincapToAssetId', () => {
    it('can get AssetId for bitcoin', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin
      })
      expect(coincapToAssetId('bitcoin')).toEqual(assetId)
    })

    it('can get AssetId id for ethereum', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum
      })
      expect(coincapToAssetId('ethereum')).toEqual(assetId)
    })

    it('can get AssetId id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(coincapToAssetId('fox-token')).toEqual(assetId)
    })
  })

  it('can get AssetId for cosmos', () => {
    const chain = ChainTypes.Cosmos
    const network = NetworkTypes.COSMOSHUB_MAINNET
    const assetId = toAssetId({
      chain,
      network,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Cosmos
    })
    expect(coincapToAssetId('cosmos')).toEqual(assetId)
  })

  it('can get AssetId for osmosis', () => {
    const chain = ChainTypes.Osmosis
    const network = NetworkTypes.OSMOSIS_MAINNET
    const assetId = toAssetId({
      chain,
      network,
      assetNamespace: 'slip44',
      assetReference: ASSET_REFERENCE.Osmosis
    })
    expect(coincapToAssetId('osmosis')).toEqual(assetId)
  })

  describe('assetIdToCoinCap', () => {
    it('can get coincap id for bitcoin AssetId', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Bitcoin
      })
      expect(assetIdToCoinCap(assetId)).toEqual('bitcoin')
    })

    it('can get coincap id for ethereum AssetId', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Ethereum
      })
      expect(assetIdToCoinCap(assetId)).toEqual('ethereum')
    })

    it('can get coincap id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = 'erc20'
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(assetIdToCoinCap(assetId)).toEqual('fox-token')
    })

    it('can get coincap id for cosmos AssetId', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Cosmos
      })
      expect(assetIdToCoinCap(assetId)).toEqual('cosmos')
    })

    it('can get coincap id for osmosis AssetId', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: 'slip44',
        assetReference: ASSET_REFERENCE.Osmosis
      })
      expect(assetIdToCoinCap(assetId)).toEqual('osmosis')
    })
  })
})
