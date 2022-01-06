import { ChainTypes } from '@shapeshiftoss/types'

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

const ethAccountSpecifier = `${ethCaip2}:${ethAccount.pubkey.toLowerCase()}`
const btcAccountSpecifier = `${btcCaip2}:${btcAccount.pubkey.toLowerCase()}`
const ethCaip10 = `${ethCaip2}:${ethAccount.pubkey.toLowerCase()}`

const portfolio: Portfolio = {
  accounts: {
    byId: {
      [ethAccountSpecifier]: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19],
      [btcAccountSpecifier]: [btcCaip19]
    },
    ids: [ethAccountSpecifier, btcAccountSpecifier]
  },
  assetBalances: {
    byId: {
      [ethCaip19]: '27803816548287370',
      [foxCaip19]: '42729243327349401946',
      [usdcCaip19]: '41208456',
      [yvusdcCaip19]: '8178352',
      [`${btcCaip19}`]: '1010'
    },
    ids: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19, btcCaip19]
  },
  accountBalances: {
    byId: {
      [ethAccountSpecifier]: {
        [ethCaip19]: '27803816548287370',
        [foxCaip19]: '42729243327349401946',
        [usdcCaip19]: '41208456',
        [yvusdcCaip19]: '8178352'
      },
      [btcAccountSpecifier]: {
        [btcCaip19]: '1010'
      }
    },
    ids: [ethAccountSpecifier, btcAccountSpecifier]
  },
  accountSpecifiers: {
    byId: {
      [ethAccountSpecifier]: [ethCaip10],
      [btcAccountSpecifier]: [
        // btc caip10s
        ...btcAccount.chainSpecific.addresses.map(address => `${btcCaip2}:${address.pubkey}`)
      ]
    },
    ids: [ethAccountSpecifier, btcAccountSpecifier]
  }
}

describe('accountToPortfolio', () => {
  it('can normalize eth and btc accounts to portfolio', () => {
    const accounts = { [ethAccount.pubkey]: ethAccount, [btcAccount.pubkey]: btcAccount }
    const result = accountToPortfolio(accounts)
    expect(result).toEqual(portfolio)
  })
})
