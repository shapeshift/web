import { caip10 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, NetworkTypes } from '@shapeshiftoss/types'

import { accountsToPortfolio, Portfolio } from './portfolioSlice'

const ethCaip2 = 'eip155:1'
const ethCaip19 = 'eip155:1/slip44:60'
const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const usdcCaip19 = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const yvusdcCaip19 = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'

const account = {
  balance: '27803816548287370',
  caip2: ethCaip2,
  caip19: ethCaip19,
  chain: ChainTypes.Ethereum,
  chainSpecific: {
    nonce: 5,
    tokens: [
      {
        balance: '42729243327349401946',
        caip19: foxCaip19
      },
      {
        balance: '41208456',
        caip19: usdcCaip19
      },
      {
        balance: '8178352',
        caip19: yvusdcCaip19
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
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'
      ]
    },
    ids: ['eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63']
  },
  balances: {
    byId: {
      'eip155:1/slip44:60': '27803816548287370',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': '42729243327349401946',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '41208456',
      'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9': '8178352'
    },
    ids: [
      'eip155:1/slip44:60',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'
    ]
  }
}

describe('accountToPortfolio', () => {
  it('can normalize eth account to portfolio', () => {
    const CAIP10 = caip10.toCAIP10({ caip2: ethCaip2, account: account.pubkey })
    const accounts = { [CAIP10]: account }
    const result = accountsToPortfolio(accounts)
    expect(result).toEqual(portfolio)
  })
})
