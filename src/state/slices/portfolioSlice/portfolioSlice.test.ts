import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'

import { accountToPortfolio, Portfolio } from './portfolioSlice'

const ethCaip2 = 'eip155:1'
const ethCaip19 = 'eip155:1/slip44:60'
const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const usdcCaip19 = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const yvusdcCaip19 = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'

const btcCaip2 = 'bip122:000000000019d6689c085ae165831e93'
const btcCaip19 = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

const ethAccount = {
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
  pubkey: '0x934be745172066EDF795ffc5EA9F28f19b440c63'
}

const btcAccount = {
  balance: '27803816548287370',
  caip2: btcCaip2,
  caip19: btcCaip19,
  chain: ChainTypes.Bitcoin,
  chainSpecific: {
    addresses: [
      {
        balance: '1000',
        pubkey: 'bc1qr9y9lxpynxm8nkswez555xnv2plwwluxrpa55l'
      },
      {
        balance: '0',
        pubkey: 'bc1q3fmp9tdacg5edlgmh8ttxz7cvj598dcn7w9xxd'
      },
      {
        balance: '10',
        pubkey: 'bc1qvzuvxskhr5eyaf65w37jxwwvskwyw3rlnqtyzc'
      },
      {
        balance: '0',
        pubkey: 'bc1q4cqvc3ul562uuz358y77hmqhlfex8jhvfzzek8'
      }
    ],
    nextChangeAddressIndex: 3,
    nextReceiveAddressIndex: 3
  },
  pubkey:
    'zpub6qk8s2NQsYG6X2Mm6iU2ii3yTAqDb2XqnMu9vo2WjvqwjSvjjiYQQveYXbPxrnRT5Yb5p0x934be745172066EDF795ffc5EA9F28f19b440c637BaBw1wowPwbS8fj7uCfj3UhqhD2LLbvY6Ni1w'
}

const portfolio: Portfolio = {
  accounts: {
    byId: {
      'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63': [
        'eip155:1/slip44:60',
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'
      ],
      [`${btcCaip2}:${btcAccount.pubkey}`]: [`${btcCaip19}`]
    },
    ids: ['eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63', `${btcCaip2}:${btcAccount.pubkey}`]
  },
  assetBalances: {
    byId: {
      'eip155:1/slip44:60': '27803816548287370',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': '42729243327349401946',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '41208456',
      'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9': '8178352',
      [`${btcCaip19}`]: '1010'
    },
    ids: [
      'eip155:1/slip44:60',
      'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d',
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9',
      `${btcCaip19}`
    ]
  },
  accountBalances: {
    byId: {
      'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63': {
        'eip155:1/slip44:60': '27803816548287370',
        'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': '42729243327349401946',
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '41208456',
        'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9': '8178352'
      },
      [`${btcCaip2}:${btcAccount.pubkey.toLowerCase()}`]: {
        [`${btcCaip19}`]: '1010'
      }
    },
    ids: [
      'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63',
      `${btcCaip2}:${btcAccount.pubkey.toLowerCase()}`
    ]
  },
  accountSpecifiers: {
    byId: {
      'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63': [
        'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63'
      ],
      [`${btcCaip2}:${btcAccount.pubkey.toLowerCase()}`]: [
        `${btcCaip2}:bc1qr9y9lxpynxm8nkswez555xnv2plwwluxrpa55l`,
        `${btcCaip2}:bc1q3fmp9tdacg5edlgmh8ttxz7cvj598dcn7w9xxd`,
        `${btcCaip2}:bc1qvzuvxskhr5eyaf65w37jxwwvskwyw3rlnqtyzc`,
        `${btcCaip2}:bc1q4cqvc3ul562uuz358y77hmqhlfex8jhvfzzek8`
      ]
    },
    ids: [
      'eip155:1:0x934be745172066edf795ffc5ea9f28f19b440c63',
      `${btcCaip2}:${btcAccount.pubkey.toLowerCase()}`
    ]
  }
}

describe('accountToPortfolio', () => {
  it('can normalize eth and btc accounts to portfolio', () => {
    const accounts = { [ethAccount.pubkey]: ethAccount, [btcAccount.pubkey]: btcAccount }
    const result = accountToPortfolio(accounts)
    expect(result).toEqual(portfolio)
  })
})
