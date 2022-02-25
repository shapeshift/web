import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { toCAIP19 } from '../../caip19/caip19'
import { CAIP19ToCoingecko, coingeckoToCAIP19 } from '.'

describe('coingecko adapter', () => {
  describe('coingeckoToCAIP19', () => {
    it('can get CAIP19 for bitcoin', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(coingeckoToCAIP19('bitcoin')).toEqual(caip19)
    })

    it('can get CAIP19 id for ethereum', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(coingeckoToCAIP19('ethereum')).toEqual(caip19)
    })

    it('can get CAIP19 id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const caip19 = toCAIP19({ chain, network, contractType, tokenId })
      expect(coingeckoToCAIP19('shapeshift-fox-token')).toEqual(caip19)
    })
  })

  it('can get CAIP19 for cosmos', () => {
    const chain = ChainTypes.Cosmos
    const network = NetworkTypes.COSMOSHUB_MAINNET
    const caip19 = toCAIP19({ chain, network })
    expect(coingeckoToCAIP19('cosmos')).toEqual(caip19)
  })

  it('can get CAIP19 for osmosis', () => {
    const chain = ChainTypes.Osmosis
    const network = NetworkTypes.OSMOSIS_MAINNET
    const caip19 = toCAIP19({ chain, network })
    expect(coingeckoToCAIP19('osmosis')).toEqual(caip19)
  })

  describe('CAIP19toCoingecko', () => {
    it('can get coingecko id for bitcoin CAIP19', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(CAIP19ToCoingecko(caip19)).toEqual('bitcoin')
    })

    it('can get coingecko id for ethereum CAIP19', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(CAIP19ToCoingecko(caip19)).toEqual('ethereum')
    })

    it('can get coingecko id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const caip19 = toCAIP19({ chain, network, contractType, tokenId })
      expect(CAIP19ToCoingecko(caip19)).toEqual('shapeshift-fox-token')
    })

    it('can get coingecko id for cosmos CAIP19', () => {
      const chain = ChainTypes.Cosmos
      const network = NetworkTypes.COSMOSHUB_MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(CAIP19ToCoingecko(caip19)).toEqual('cosmos')
    })

    it('can get coingecko id for osmosis CAIP19', () => {
      const chain = ChainTypes.Osmosis
      const network = NetworkTypes.OSMOSIS_MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(CAIP19ToCoingecko(caip19)).toEqual('osmosis')
    })
  })
})
