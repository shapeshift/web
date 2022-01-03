import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'
import toLower from 'lodash/toLower'

import { toCAIP19 } from './../../caip19/caip19'
import { CAIP19ToYearn, yearnToCAIP19 } from '.'

describe('yearn adapter', () => {
  describe('yearnToCAIP19', () => {
    it('can get CAIP19 id for yvUSDC 0.3.0', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      const caip19 = toCAIP19({ chain, network, contractType, tokenId: toLower(checksumAddress) })
      expect(yearnToCAIP19(checksumAddress)).toEqual(caip19)
    })
  })
  describe('CAIP19ToYearn', () => {
    it('can get coincap id for yvUSDC 0.3.0', () => {
      const chain = ChainTypes.Ethereum
      const network = NetworkTypes.MAINNET
      const contractType = ContractTypes.ERC20
      const checksumAddress = '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      const caip19 = toCAIP19({ chain, network, contractType, tokenId: toLower(checksumAddress) })
      expect(CAIP19ToYearn(caip19)).toEqual(checksumAddress)
    })
  })
})
