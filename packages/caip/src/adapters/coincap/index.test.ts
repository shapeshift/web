import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { AssetNamespace, AssetReference, toCAIP19 } from '../../caip19/caip19'
import { CAIP19ToCoinCap, coincapToCAIP19 } from '.'

describe('adapters:coincap', () => {
  describe('coincapToCAIP19', () => {
    it('can get CAIP19 for bitcoin', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Bitcoin
      })
      expect(coincapToCAIP19('bitcoin')).toEqual(caip19)
    })

    it('can get CAIP19 id for ethereum', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Ethereum
      })
      expect(coincapToCAIP19('ethereum')).toEqual(caip19)
    })

    it('can get CAIP19 id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(coincapToCAIP19('fox-token')).toEqual(caip19)
    })
  })

  it('can get CAIP19 for cosmos', () => {
    const chain = ChainTypes.Cosmos
    const network = NetworkTypes.COSMOSHUB_MAINNET
    const caip19 = toCAIP19({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Cosmos
    })
    expect(coincapToCAIP19('cosmos')).toEqual(caip19)
  })

  it('can get CAIP19 for osmosis', () => {
    const chain = ChainTypes.Osmosis
    const network = NetworkTypes.OSMOSIS_MAINNET
    const caip19 = toCAIP19({
      chain,
      network,
      assetNamespace: AssetNamespace.Slip44,
      assetReference: AssetReference.Osmosis
    })
    expect(coincapToCAIP19('osmosis')).toEqual(caip19)
  })

  describe('CAIP19ToCoinCap', () => {
    it('can get coincap id for bitcoin CAIP19', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Bitcoin
      })
      expect(CAIP19ToCoinCap(caip19)).toEqual('bitcoin')
    })

    it('can get coincap id for ethereum CAIP19', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Ethereum
      })
      expect(CAIP19ToCoinCap(caip19)).toEqual('ethereum')
    })

    it('can get coincap id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const assetNamespace = AssetNamespace.ERC20
      const assetReference = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const caip19 = toCAIP19({ chain, network, assetNamespace, assetReference })
      expect(CAIP19ToCoinCap(caip19)).toEqual('fox-token')
    })

    it('can get coincap id for cosmos CAIP19', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const caip19 = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Cosmos
      })
      expect(CAIP19ToCoinCap(caip19)).toEqual('cosmos')
    })

    it('can get coincap id for osmosis CAIP19', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const caip19 = toCAIP19({
        chain,
        network,
        assetNamespace: AssetNamespace.Slip44,
        assetReference: AssetReference.Osmosis
      })
      expect(CAIP19ToCoinCap(caip19)).toEqual('osmosis')
    })
  })
})
