import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { toCAIP19 } from './../../caip19/caip19'
import { CAIP19ToCoinCap, coincapToCAIP19 } from '.'

describe('coincap adapter', () => {
  describe('coincapToCAIP19', () => {
    it('can get CAIP19 for bitcoin', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(coincapToCAIP19('bitcoin')).toEqual(caip19)
    })

    it('can get CAIP19 id for ethereum', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(coincapToCAIP19('ethereum')).toEqual(caip19)
    })

    it('can get CAIP19 id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const caip19 = toCAIP19({ chain, network, contractType, tokenId })
      expect(coincapToCAIP19('fox-token')).toEqual(caip19)
    })
  })

  describe('CAIP19ToCoinCap', () => {
    it('can get coincap id for bitcoin CAIP19', () => {
      const chain = ChainTypes.Bitcoin
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(CAIP19ToCoinCap(caip19)).toEqual('bitcoin')
    })

    it('can get coincap id for ethereum CAIP19', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const caip19 = toCAIP19({ chain, network })
      expect(CAIP19ToCoinCap(caip19)).toEqual('ethereum')
    })

    it('can get coincap id for FOX', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const tokenId = '0xc770eefad204b5180df6a14ee197d99d808ee52d'
      const caip19 = toCAIP19({ chain, network, contractType, tokenId })
      expect(CAIP19ToCoinCap(caip19)).toEqual('fox-token')
    })
  })
})
