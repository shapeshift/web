import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { accountToPortfolio, Portfolio } from './portfolioSlice'

const account = {
  balance: '27803816548287370',
  chain: ChainTypes.Ethereum,
  chainSpecific: {
    nonce: 5,
    tokens: [
      {
        balance: '42729243327349401946',
        contract: '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        contractType: ContractTypes.ERC20,
        name: 'FOX',
        precision: 18,
        symbol: 'FOX'
      },
      {
        balance: '41208456',
        contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        contractType: ContractTypes.ERC20,
        name: 'USD Coin',
        precision: 6,
        symbol: 'USDC'
      },
      {
        balance: '8178352',
        contract: '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
        contractType: ContractTypes.ERC20,
        name: 'USDC yVault',
        precision: 6,
        symbol: 'yvUSDC'
      }
    ]
  },
  network: NetworkTypes.MAINNET,
  pubkey: '0x934be745172066EDF795ffc5EA9F28f19b440c63',
  symbol: 'ETH'
}

const portfolio: Portfolio = {
  accounts: {
    byId: {
      'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63': [
        'eip155:1/slip44:60',
        'eip155:1/erc20:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'eip155:1/erc20:0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
      ]
    },
    ids: ['eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63']
  },
  balances: {
    byId: {
      'eip155:1/slip44:60': '27803816548287370',
      'eip155:1/erc20:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d': '42729243327349401946',
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': '41208456',
      'eip155:1/erc20:0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9': '8178352'
    },
    ids: [
      'eip155:1/slip44:60',
      'eip155:1/erc20:0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d',
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      'eip155:1/erc20:0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9'
    ]
  }
}

describe('accountToPortfolio', () => {
  it('can normalize eth account to portfolio', () => {
    const result = accountToPortfolio(account)
    expect(result).toEqual(portfolio)
  })
})
