import { ChainTypes } from '@shapeshiftoss/types'
import { ethereum, fox } from 'test/mocks/assets'
import { mockStore } from 'test/mocks/store'

import {
  accountToPortfolio,
  Portfolio,
  selectAccountIdByAddress,
  selectPortfolioAssetAccounts,
  selectPortfolioAssetIdsByAccountId,
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioFiatAccountBalances,
  selectPortfolioFiatBalancesByFilter
} from './portfolioSlice'

const ethCaip2 = 'eip155:1'
const ethCaip19 = 'eip155:1/slip44:60'
const foxCaip19 = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const usdcCaip19 = 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const yvusdcCaip19 = 'eip155:1/erc20:0x5f18c75abdae578b483e5f43f12a39cf75b973a9'

const btcCaip2 = 'bip122:000000000019d6689c085ae165831e93'
const btcCaip19 = 'bip122:000000000019d6689c085ae165831e93/slip44:0'

const btcCaip10s = [
  'bip122:000000000019d6689c085ae165831e93:bc1qp45tn99yv90gnkqlx9q8uryr9ekxmrzm472kn7',
  'bip122:000000000019d6689c085ae165831e93:bc1qx0aaya6e0e8rfukvma9adhncjd77yhas70qukt',
  'bip122:000000000019d6689c085ae165831e93:bc1qtjxklypn7zhp05ja29c5z8ycscmq0vhhzslm99'
]
const ethCaip10s = ['eip155:1:0x9a2d593725045d1727d525dd07a396f9ff079bb1']

const ethAccount1 = {
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
  balance: '1010',
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

const ethAccountSpecifier = `${ethCaip2}:${ethAccount1.pubkey.toLowerCase()}`
const btcAccountSpecifier = `${btcCaip2}:${btcAccount.pubkey}`
const ethCaip10 = `${ethCaip2}:${ethAccount1.pubkey.toLowerCase()}`

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
      [btcAccountSpecifier]: btcAccount.chainSpecific.addresses.map(
        address => `${btcCaip2}:${address.pubkey}`
      )
    },
    ids: [ethAccountSpecifier, btcAccountSpecifier]
  }
}

const state = {
  ...mockStore,
  assets: {
    byId: {
      [ethCaip19]: ethereum,
      [foxCaip19]: fox
    },
    ids: [ethCaip19, foxCaip19]
  },
  marketData: {
    ...mockStore.marketData,
    byId: {
      [ethCaip19]: {
        price: '1000',
        marketCap: '10000',
        volume: '100000',
        changePercent24Hr: 10
      },
      [foxCaip19]: {
        price: '1',
        marketCap: '10000',
        volume: '100000',
        changePercent24Hr: 10
      }
    },
    ids: [ethCaip19]
  },
  portfolio: {
    ...mockStore.portfolio,
    assetBalances: {
      byId: {
        [ethCaip19]: '27803816548287370',
        [foxCaip19]: '42729243327349401946'
      },
      ids: [ethCaip19, foxCaip19]
    },
    accountBalances: {
      byId: {
        [ethAccountSpecifier]: {
          [ethCaip19]: '27803816548287370',
          [foxCaip19]: '42729243327349401946'
        }
      },
      ids: [ethAccountSpecifier]
    }
  }
}

describe('accountToPortfolio', () => {
  it('can normalize eth and btc accounts to portfolio', () => {
    const accounts = { [ethAccount1.pubkey]: ethAccount1, [btcAccount.pubkey]: btcAccount }
    const result = accountToPortfolio(accounts)
    expect(result).toEqual(portfolio)
  })
})

describe('selectPortfolioAssetAccounts', () => {
  it('can get accounts containing an asset', () => {
    const fooAccount = '0xfoo'
    const barAccount = '0xbar'
    const bazAccount = '0xbaz'

    const state = {
      ...mockStore,
      portfolio: {
        ...mockStore.portfolio,
        accounts: {
          byId: {
            [fooAccount]: [ethCaip19],
            [barAccount]: [ethCaip19],
            [bazAccount]: []
          },
          ids: [fooAccount, barAccount, bazAccount]
        }
      }
    }

    const selected = selectPortfolioAssetAccounts(state, ethCaip19)
    const expected = [fooAccount, barAccount]
    expect(selected).toEqual(expected)
  })
})

describe('selectAccountIdByAddress', () => {
  const state = {
    ...mockStore,
    portfolio: {
      ...mockStore.portfolio,
      accountSpecifiers: {
        byId: {
          [btcAccountSpecifier]: btcCaip10s,
          [ethAccountSpecifier]: ethCaip10s
        },
        ids: [btcAccountSpecifier, ethAccountSpecifier]
      }
    }
  }

  it('can select account id by address (CAIP10)', () => {
    const btcAccSpecifier = selectAccountIdByAddress(state, btcCaip10s[0])
    const ethAccSpecifier = selectAccountIdByAddress(state, ethCaip10s[0])

    expect(btcAccSpecifier).toEqual(btcAccountSpecifier)
    expect(ethAccSpecifier).toEqual(ethAccountSpecifier)
  })

  it('can select account id with address in non checksum format', () => {
    const newState = {
      ...state,
      portfolio: {
        ...state.portfolio,
        accountSpecifiers: {
          ...state.portfolio.accountSpecifiers,
          byId: {
            ...state.portfolio.accountSpecifiers.byId,
            [btcAccountSpecifier]: btcCaip10s.map(caip10s => caip10s.toUpperCase())
          }
        }
      }
    }

    // caip10s in state in non checksum format
    const btcAccSpecifier = selectAccountIdByAddress(newState, btcCaip10s[0])
    expect(btcAccSpecifier).toEqual(btcAccountSpecifier)

    // caip10 argument in non checksum format
    const ethAccSpecifier = selectAccountIdByAddress(state, ethCaip10s[0].toUpperCase())
    expect(ethAccSpecifier).toEqual(ethAccountSpecifier)
  })
})

describe('selectPortfolioAssetCryptoBalanceByAssetId', () => {
  it('can select crypto asset balance by asset Id', () => {
    const state = {
      ...mockStore,
      portfolio: {
        ...mockStore.portfolio,
        accountBalances: {
          ...mockStore.portfolio.accountBalances
        }
      }
    }

    const cryptoAssetBalanceByAccount = selectPortfolioCryptoBalanceByAssetId(state, ethCaip19)
    expect(cryptoAssetBalanceByAccount).toBe(mockStore.portfolio.assetBalances.byId[ethCaip19])
  })
})

describe('Fiat Balance Selectors', () => {
  describe('selectPortfolioFiatAccountBalance', () => {
    it('can select crypto fiat account balance', () => {
      const returnValue = {
        [ethAccountSpecifier]: {
          [ethCaip19]: '27.80',
          [foxCaip19]: '42.73'
        }
      }

      const fiatAccountBalance = selectPortfolioFiatAccountBalances(state)
      expect(fiatAccountBalance).toEqual(returnValue)
    })

    it('returns 0 when no market data is available', () => {
      const currentState = {
        ...state,
        marketData: {
          ...mockStore.marketData
        }
      }

      const returnValue = {
        [ethAccountSpecifier]: {
          [ethCaip19]: '0.00',
          [foxCaip19]: '0.00'
        }
      }

      const fiatAccountBalance = selectPortfolioFiatAccountBalances(currentState)
      expect(fiatAccountBalance).toEqual(returnValue)
    })
  })

  describe('selectPortfolioFiatBalancesByFilter', () => {
    it('Should be able to filter by assetId', () => {
      const expected = '27.80'
      const result = selectPortfolioFiatBalancesByFilter(state, { assetId: ethCaip19 })
      expect(result).toEqual(expected)
    })

    it('Should be able to filter by accountId', () => {
      const expected = '70.53'
      const result = selectPortfolioFiatBalancesByFilter(state, { accountId: ethAccountSpecifier })
      expect(result).toEqual(expected)
    })

    it('Should be able to filter by accountId and assetId', () => {
      const expected = '42.73'
      const result = selectPortfolioFiatBalancesByFilter(state, {
        accountId: ethAccountSpecifier,
        assetId: foxCaip19
      })
      expect(result).toEqual(expected)
    })

    it('Should return an empty string when accountId and assetId are not provided', () => {
      const result = selectPortfolioFiatBalancesByFilter(state)
      expect(result).toEqual('0')
    })
  })
})

describe('selectPortfolioTokenIdsByAccountId', () => {
  it('should return an array of assetIds (caip19) by accountId', () => {
    const expected = [ethCaip19, foxCaip19]
    const result = selectPortfolioAssetIdsByAccountId(state, ethAccountSpecifier)

    expect(result).toEqual(expected)
  })
})
