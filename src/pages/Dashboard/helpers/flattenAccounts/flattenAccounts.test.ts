import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { flattenAccounts } from './flattenAccounts'

const accounts = {
  ethereum: {
    balance: '65158001274197689',
    chain: ChainTypes.Ethereum,
    chainSpecific: {
      nonce: 183,
      tokens: [
        {
          balance: '0',
          contract: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d',
          contractType: ContractTypes.ERC20,
          name: 'Golem Network Token',
          precision: 18,
          symbol: 'GNT'
        }
      ]
    },
    network: NetworkTypes.MAINNET,
    pubkey: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
    symbol: 'ETH'
  }
}

describe('flattenAccounts', () => {
  it('takes accounts and flattens them so tokens are on the same level', async () => {
    expect(flattenAccounts(accounts).length).toEqual(2)
  })

  it('flattens multiple chains', async () => {
    const multiAccount = {
      ...accounts,
      bitcoin: {
        balance: '65158001274197689',
        chain: ChainTypes.Bitcoin,
        chainSpecific: {},
        network: NetworkTypes.MAINNET,
        pubkey: '0x9124248f2AD8c94fC4a403588BE7a77984B34bb8',
        symbol: 'BTC'
      }
    }
    expect(flattenAccounts(multiAccount).length).toEqual(3)
  })
})
