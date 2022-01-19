import { ChainTypes } from '@shapeshiftoss/types'
import { ethereum, fox } from 'test/mocks/assets'
import { mockStore } from 'test/mocks/store'
import { bn } from 'lib/bignumber/bignumber'

import {
  accountToPortfolio,
  Portfolio,
  PortfolioAccountBalances,
  selectAccountIdByAddress,
  selectPortfolioAllocationPercentByAccountId,
  selectPortfolioAssetAccounts,
  selectPortfolioAssetIdsByAccountId,
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatAccountBalances,
  selectPortfolioFiatBalanceByFilter,
  selectPortfolioTotalFiatBalanceByAccount
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
const ethCaip10s = [
  'eip155:1:0x9a2d593725045d1727d525dd07a396f9ff079bb1',
  'eip155:1:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'
]

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

const ethAccount2 = {
  balance: '23803816548287370',
  caip2: ethCaip2,
  caip19: ethCaip19,
  chain: ChainTypes.Ethereum,
  chainSpecific: {
    nonce: 5,
    tokens: [
      {
        balance: '40729243327349401946',
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
  pubkey: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'
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

const ethAccountSpecifier1 = `${ethCaip2}:${ethAccount1.pubkey.toLowerCase()}`
const ethAccountSpecifier2 = `${ethCaip2}:${ethAccount2.pubkey.toLowerCase()}`
const btcAccountSpecifier = `${btcCaip2}:${btcAccount.pubkey}`
const eth1Caip10 = `${ethCaip2}:${ethAccount1.pubkey.toLowerCase()}`
const eth2Caip10 = `${ethCaip2}:${ethAccount2.pubkey.toLowerCase()}`

const calculatePortfolioAssetBalances = (assets): { [k: CAIP19]: string } => {
  return assets.reduce((acc, asset) => {
    switch (asset.caip2) {
      case ethCaip2:
        if (!acc[asset.caip19]) {
          acc[asset.caip19] = asset.balance
        } else {
          acc[asset.caip19] = bn(acc[asset.caip19]).plus(asset.balance).toString()
        }

        const tokens = asset.chainSpecific.tokens

        for (const token of tokens) {
          if (acc[token.caip19]) {
            acc[token.caip19] = bn(acc[token.caip19]).plus(token.balance).toString()
          } else {
            acc[token.caip19] = token.balance
          }
        }

        break
      case btcCaip2:
        if (!acc[asset.caip19]) {
          acc[asset.caip19] = asset.balance
        } else {
          acc[asset.caip19] = bn(acc[asset.caip19]).plus(asset.balance).toString()
        }

        break
      default:
    }

    return acc
  }, {})
}

console.log({
  portfolioAssetBalances: calculatePortfolioAssetBalances([ethAccount1, ethAccount2, btcAccount])
})

const ACCOUNTS = [ethAccount1, ethAccount2, btcAccount]

const portfolio: Portfolio = {
  accounts: {
    byId: {
      [ethAccountSpecifier1]: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19],
      [ethAccountSpecifier2]: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19],
      [btcAccountSpecifier]: [btcCaip19]
    },
    ids: [ethAccountSpecifier1, ethAccountSpecifier2, btcAccountSpecifier]
  },
  assetBalances: {
    byId: {
      ...calculatePortfolioAssetBalances(ACCOUNTS)
    },
    ids: [ethCaip19, foxCaip19, usdcCaip19, yvusdcCaip19, btcCaip19]
  },
  accountBalances: {
    byId: {
      [ethAccountSpecifier1]: {
        [ethCaip19]: '27803816548287370',
        [foxCaip19]: '42729243327349401946',
        [usdcCaip19]: '41208456',
        [yvusdcCaip19]: '8178352'
      },
      [ethAccountSpecifier2]: {
        [ethCaip19]: '23803816548287370',
        [foxCaip19]: '40729243327349401946',
        [usdcCaip19]: '41208456',
        [yvusdcCaip19]: '8178352'
      },
      [btcAccountSpecifier]: {
        [btcCaip19]: '1010'
      }
    },
    ids: [ethAccountSpecifier1, ethAccountSpecifier2, btcAccountSpecifier]
  },
  accountSpecifiers: {
    byId: {
      [ethAccountSpecifier1]: [eth1Caip10],
      [ethAccountSpecifier2]: [eth2Caip10],
      [btcAccountSpecifier]: btcAccount.chainSpecific.addresses.map(
        address => `${btcCaip2}:${address.pubkey}`
      )
    },
    ids: [ethAccountSpecifier1, ethAccountSpecifier2, btcAccountSpecifier]
  }
}

const calculateAssetBalances = (accountBalances: PortfolioAccountBalances['byId']) => {
  return Object.entries(accountBalances).reduce<{ [k: string]: string }>((acc, [_, assetObj]) => {
    return Object.entries(assetObj).reduce<{ [k: string]: string }>(
      (_, [assetId, assetBalance]) => {
        if (!acc[assetId]) {
          acc[assetId] = assetBalance
          return acc
        }

        acc[assetId] = bn(acc[assetId]).plus(assetBalance).toString()
        return acc
      },
      {}
    )
  }, {})
}

const createState = ({
  assets = {},
  marketData = {},
  portfolio = {},
  accountBalances = {}
}: {
  assets: any
  marketData: any
  portfolio: any
  accountBalances: any
}) => {
  return {
    ...mockStore,
    assets: {
      ...mockStore.assets,
      ...assets
    },
    marketData: {
      ...mockStore.marketData,
      ...marketData
    },
    portfolio: {
      ...mockStore.portfolio,
      ...portfolio,
      assetBalances: {
        ...mockStore.portfolio.assetBalances,
        ...calculateAssetBalances(accountBalances)
      },
      accountBalances: {
        ...mockStore.portfolio.accountBalances,
        ...accountBalances
      }
    }
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
        [ethCaip19]: '115607633096574740',
        [foxCaip19]: '105458486654698803892'
      },
      ids: [ethCaip19, foxCaip19]
    },
    accountBalances: {
      byId: {
        [ethAccountSpecifier1]: {
          [ethCaip19]: '27803816548287370',
          [foxCaip19]: '42729243327349401946'
        },
        [ethAccountSpecifier2]: {
          [ethCaip19]: '87803816548287370',
          [foxCaip19]: '62729243327349401946'
        }
      },
      ids: [ethAccountSpecifier1, ethAccountSpecifier2]
    }
  }
}

const assetBalances = calculateAssetBalances(state.portfolio.accountBalances.byId)

console.log({ assetBalances })

describe('accountToPortfolio', () => {
  it('can normalize eth and btc accounts to portfolio', () => {
    const accounts = {
      [ethAccount1.pubkey]: ethAccount1,
      [ethAccount2.pubkey]: ethAccount2,
      [btcAccount.pubkey]: btcAccount
    }
    const result = accountToPortfolio(accounts)
    expect(result).toEqual(portfolio)
  })
})

describe('selectPortfolioAssetAccounts', () => {
  it('can get accounts containing an asset', () => {
    const fooAccount = '0xfoo'
    const barAccount = '0xbar'
    const bazAccount = '0xbaz'

    const portfolio = {
        accounts: {
          byId: {
            [fooAccount]: [ethCaip19],
            [barAccount]: [ethCaip19],
            [bazAccount]: []
          },
          ids: [fooAccount, barAccount, bazAccount]
        }
    }

    const state = createState({ portfolio })

    const selected = selectPortfolioAssetAccounts(state, ethCaip19)
    const expected = [fooAccount, barAccount]
    expect(selected).toEqual(expected)
  })
})

describe('selectAccountIdByAddress', () => {
  const portfolio = {
    accountSpecifiers: {
      byId: {
        [btcAccountSpecifier]: btcCaip10s,
        [ethAccountSpecifier1]: ethCaip10s
      },
      ids: [btcAccountSpecifier, ethAccountSpecifier1]
    }
  }

  const state = createState({ portfolio })

  it('can select account id by address (CAIP10)', () => {
    const btcAccSpecifier = selectAccountIdByAddress(state, btcCaip10s[0])
    const ethAccSpecifier = selectAccountIdByAddress(state, ethCaip10s[0])

    expect(btcAccSpecifier).toEqual(btcAccountSpecifier)
    expect(ethAccSpecifier).toEqual(ethAccountSpecifier1)
  })

  it('can select account id with address in non checksum format', () => {
    const portfolio = {
        accountSpecifiers: {
          byId: {
            ...state.portfolio.accountSpecifiers.byId,
            [btcAccountSpecifier]: btcCaip10s.map(caip10s => caip10s.toUpperCase())
          }
        }
    }

    const newState = createState({ portfolio })

    // caip10s in state in non checksum format
    const btcAccSpecifier = selectAccountIdByAddress(newState, btcCaip10s[0])
    expect(btcAccSpecifier).toEqual(btcAccountSpecifier)

    // caip10 argument in non checksum format
    const ethAccSpecifier = selectAccountIdByAddress(state, ethCaip10s[0].toUpperCase())
    expect(ethAccSpecifier).toEqual(ethAccountSpecifier1)
  })
})

describe('selectPortfolioAssetCryptoBalanceByAssetId', () => {
  it('can select crypto asset balance by asset Id', () => {
    const portfolio = {
      accountBalances: {
        ...mockStore.portfolio.accountBalances
      }
    }

    const state = createState({ portfolio })

    const cryptoAssetBalanceByAccount = selectPortfolioCryptoBalanceByAssetId(state, ethCaip19)
    expect(cryptoAssetBalanceByAccount).toBe(mockStore.portfolio.assetBalances.byId[ethCaip19])
  })
})

describe('selectPortfolioAllocationPercentByAccountId', () => {
  it('can select fiat allocation by accountId', () => {
    const returnValue = 68.09155471117745

    const allocationByAccountId = selectPortfolioAllocationPercentByAccountId(
      state,
      ethAccountSpecifier2
    )
    expect(allocationByAccountId).toEqual(returnValue)
  })
})

describe('Fiat Balance Selectors', () => {
  describe('selectPortfolioFiatAccountBalance', () => {
    it('can select crypto fiat account balance', () => {
      const returnValue = {
        [ethAccountSpecifier1]: {
          [ethCaip19]: '27.80',
          [foxCaip19]: '42.73'
        },
        [ethAccountSpecifier2]: {
          [ethCaip19]: '87.80',
          [foxCaip19]: '62.73'
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
        [ethAccountSpecifier1]: {
          [ethCaip19]: '0.00',
          [foxCaip19]: '0.00'
        },
        [ethAccountSpecifier2]: {
          [ethCaip19]: '0.00',
          [foxCaip19]: '0.00'
        }
      }

      const fiatAccountBalance = selectPortfolioFiatAccountBalances(currentState)
      expect(fiatAccountBalance).toEqual(returnValue)
    })
  })

  describe('selectPortfolioFiatBalanceByFilter', () => {
    it('should be able to filter by assetId', () => {
      const expected = '115.61'
      const result = selectPortfolioFiatBalanceByFilter(state, { assetId: ethCaip19 })
      expect(result).toEqual(expected)
    })

    it('should be able to filter by accountId and assetId', () => {
      const expected = '42.73'
      const result = selectPortfolioFiatBalanceByFilter(state, {
        accountId: ethAccountSpecifier1,
        assetId: foxCaip19
      })
      expect(result).toEqual(expected)
    })
  })

  describe('selectPortfolioCryptoHumanBalancesByFilter', () => {
    it('should be able to filter by assetId', () => {
      const expected = '0.115607'
      const result = selectPortfolioCryptoHumanBalanceByFilter(state, { assetId: ethCaip19 })
      expect(result).toEqual(expected)
    })

    it('should be able to filter by accountId and assetId', () => {
      const expected = '42.729243'
      const result = selectPortfolioCryptoHumanBalanceByFilter(state, {
        accountId: ethAccountSpecifier1,
        assetId: foxCaip19
      })
      expect(result).toEqual(expected)
    })
  })

  describe('selectPortfolioTotalFiatBalanceByAccount', () => {
    it('should return total fiat balance by accountId', () => {
      const expected = {
        [ethAccountSpecifier1]: '70.53',
        [ethAccountSpecifier2]: '150.53'
      }

      const result = selectPortfolioTotalFiatBalanceByAccount(state)
      expect(result).toEqual(expected)
    })
  })
})

describe('selectPortfolioTokenIdsByAccountId', () => {
  it('should return an array of assetIds (caip19) by accountId', () => {
    const expected = [ethCaip19, foxCaip19]
    const result = selectPortfolioAssetIdsByAccountId(state, ethAccountSpecifier1)

    expect(result).toEqual(expected)
  })
})
