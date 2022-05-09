import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { AssetNamespace, AssetReference, toAssetId } from '../../assetId/assetId'
import { assetIdToCoingecko, coingeckoToAssetId } from '.'

describe('adapters:coingecko', () => {
  describe('coingeckoToAssetId', () => {
    it('can get AssetId for bitcoin', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Bitcoin
      })
      expect(coingeckoToAssetId('bitcoin')).toEqual(assetId)
    })

    it('can get AssetId id for ethereum', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Ethereum
      })
      expect(coingeckoToAssetId('ethereum')).toEqual(assetId)
    })

    it('can get AssetId id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(coingeckoToAssetId('shapeshift-fox-token')).toEqual(assetId)
    })
  })

  it('can get AssetId for cosmos', () => {
    const chain = ChainTypes.Cosmos
    const network = NetworkTypes.COSMOSHUB_MAINNET
    const assetId = toAssetId({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Cosmos
    })
    expect(coingeckoToAssetId('cosmos')).toEqual(assetId)
  })

  it('can get AssetId for osmosis', () => {
    const chain = ChainTypes.Osmosis
    const network = NetworkTypes.OSMOSIS_MAINNET
    const assetId = toAssetId({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Osmosis
    })
    expect(coingeckoToAssetId('osmosis')).toEqual(assetId)
  })

  describe('AssetIdtoCoingecko', () => {
    it('can get coingecko id for bitcoin AssetId', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Bitcoin
      })
      expect(assetIdToCoingecko(assetId)).toEqual('bitcoin')
    })

    it('can get coingecko id for ethereum AssetId', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Ethereum
      })
      expect(assetIdToCoingecko(assetId)).toEqual('ethereum')
    })

    it('can get coingecko id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const assetId = toAssetId({ chain, network, assetNamespace, assetReference })
      expect(assetIdToCoingecko(assetId)).toEqual('shapeshift-fox-token')
    })

    it('can get coingecko id for cosmos AssetId', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Cosmos
      })
      expect(assetIdToCoingecko(assetId)).toEqual('cosmos')
    })

    it('can get coingecko id for osmosis AssetId', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const assetId = toAssetId({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Osmosis
      })
      expect(assetIdToCoingecko(assetId)).toEqual('osmosis')
    })
  })
})
