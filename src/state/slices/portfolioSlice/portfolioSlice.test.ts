import { ChainTypes } from '@shapeshiftoss/types'
import {
  btcPubKeys,
  ethCaip10s,
  ethPubKeys,
  mockEthAccount,
  mockETHandBTCAccounts,
  mockEthToken,
  mockBtcAccount,
  mockBtcAddress
} from 'test/mocks/accounts'
import { mockMarketData } from 'test/mocks/marketData'
import { mockAssetState } from 'test/mocks/assets'
import { mockStore } from 'test/mocks/store'
import { createStore } from 'state/store'
import toLower from 'lodash/toLower'

import {
  accountToPortfolio,
  portfolio as portfolioSlice,
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

import { marketData as marketDataSlice } from '../marketDataSlice/marketDataSlice'
import { assets as assetsSlice } from '../assetsSlice/assetsSlice'

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

const ethAccount1 = {
  balance: '1000',
  caip2: ethCaip2,
  caip19: ethCaip19,
  chain: ChainTypes.Ethereum,
  chainSpecific: {
    nonce: 1,
    tokens: [
      {
        balance: '100',
        caip19: foxCaip19
      },
      {
        balance: '10',
        caip19: usdcCaip19
      },
      {
        balance: '1',
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

const mockUpsertPortfolio = accounts => {
  const portfolioAccounts = accounts.reduce((acc, account) => {
    acc[account.pubkey] = account
    return acc
  }, {})

  return accountToPortfolio(portfolioAccounts)
}

describe('portfolioSlice', () => {
  describe('reducers', () => {
    describe('upsertPortfolio', () => {
      describe('ethereum', () => {
        it('should update state', () => {
          const store = createStore()
          const ethAccount = mockEthAccount({
            chainSpecific: {
              tokens: [mockEthToken({ balance: '1', caip19: foxCaip19 })]
            }
          })
          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              accountToPortfolio({ [ethPubKeys[0]]: ethAccount })
            )
          )
          expect(store.getState().portfolio).toMatchSnapshot()
        })

        it('should update state with multiple accounts', () => {
          const store = createStore()
          const ethAccount = mockEthAccount({
            chainSpecific: {
              tokens: [mockEthToken({ balance: '1', caip19: foxCaip19 })]
            }
          })
          const ethAccount2 = mockEthAccount({
            balance: '10',
            pubkey: ethPubKeys[1],
            chainSpecific: {
              tokens: [mockEthToken({ balance: '2', caip19: usdcCaip19 })]
            }
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              accountToPortfolio({
                [ethPubKeys[0]]: ethAccount,
                [ethPubKeys[1]]: ethAccount2
              })
            )
          )
          expect(store.getState().portfolio).toMatchSnapshot()
        })

        it('should update state with multiple accounts with the same token', () => {
          const store = createStore()
          const ethAccount = mockEthAccount({
            chainSpecific: {
              tokens: [mockEthToken({ balance: '1', caip19: foxCaip19 })]
            }
          })
          const ethAccount2 = mockEthAccount({
            balance: '10',
            pubkey: ethPubKeys[1],
            chainSpecific: {
              tokens: [mockEthToken({ balance: '2', caip19: foxCaip19 })]
            }
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              accountToPortfolio({
                [ethPubKeys[0]]: ethAccount,
                [ethPubKeys[1]]: ethAccount2
              })
            )
          )
          expect(store.getState().portfolio).toMatchSnapshot()
        })
      })

      describe('Bitcoin', () => {
        it('should update state', () => {
          const store = createStore()
          const btcAccount = mockBtcAccount({
            chainSpecific: {
              addresses: [mockBtcAddress({ balance: '3' })]
            }
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              accountToPortfolio({ [btcPubKeys[0]]: btcAccount })
            )
          )
          expect(store.getState().portfolio).toMatchSnapshot()
        })
      })
    })
  })

  describe('accountToPortfolio', () => {
    //TODO(ryankk): do something with this test - either fix it or delete it
    it.skip('can normalize eth and btc accounts to portfolio', () => {
      const { ethAccount, ethAccount2, btcAccount } = mockETHandBTCAccounts()
      const accounts = {
        [ethAccount.pubkey]: ethAccount,
        [ethAccount2.pubkey]: ethAccount2,
        [btcAccount.pubkey]: btcAccount
      }

      // TODO: fix this to check something other than portfolio
      const result = accountToPortfolio(accounts)
      expect(result).toEqual(portfolio)
    })
  })

  describe('selectPortfolioAssetAccounts', () => {
    it('can get accounts containing an asset', () => {
      const store = createStore()
      const { ethAccount, ethAccount2 } = mockETHandBTCAccounts()

      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          accountToPortfolio({
            [ethPubKeys[0]]: ethAccount,
            [ethPubKeys[1]]: ethAccount2
          })
        )
      )

      const ethAccountId = `${ethAccount.caip2}:${toLower(ethAccount.pubkey)}`
      const ethAccount2Id = `${ethAccount2.caip2}:${toLower(ethAccount2.pubkey)}`

      const state = store.getState()

      const selected = selectPortfolioAssetAccounts(state, ethCaip19)
      const expected = [ethAccountId, ethAccount2Id]
      expect(selected).toEqual(expected)
    })
  })

  describe('selectAccountIdByAddress', () => {
    const store = createStore()
    const { ethAccount, btcAccount } = mockETHandBTCAccounts()

    store.dispatch(
      portfolioSlice.actions.upsertPortfolio(
        accountToPortfolio({
          [ethPubKeys[0]]: ethAccount,
          [btcPubKeys[0]]: btcAccount
        })
      )
    )

    const ethAccountId = `${ethAccount.caip2}:${toLower(ethAccount.pubkey)}`
    const btcAccountId = `${btcAccount.caip2}:${btcAccount.pubkey}`
    const state = store.getState()

    it('can select account id by address (CAIP10)', () => {
      const btcAccSpecifier = selectAccountIdByAddress(state, btcCaip10s[0])
      const ethAccSpecifier = selectAccountIdByAddress(state, ethCaip10s[0])

      expect(btcAccSpecifier).toEqual(btcAccountId)
      expect(ethAccSpecifier).toEqual(ethAccountId)
    })

    it('can select account id with address in non checksum format', () => {
      // caip10s in state in non checksum format
      const btcAccSpecifier = selectAccountIdByAddress(state, btcCaip10s[0])
      expect(btcAccSpecifier).toEqual(btcAccountId)

      // caip10 argument in non checksum format
      const ethAccSpecifier = selectAccountIdByAddress(state, ethCaip10s[0].toUpperCase())
      expect(ethAccSpecifier).toEqual(ethAccountId)
    })
  })

  describe('selectPortfolioAssetCryptoBalanceByAssetId', () => {
    const store = createStore()
    const { ethAccount, btcAccount } = mockETHandBTCAccounts()

    store.dispatch(
      portfolioSlice.actions.upsertPortfolio(mockUpsertPortfolio([ethAccount, btcAccount]))
    )

    const state = store.getState()

    it('can select crypto asset balance by asset Id', () => {
      const cryptoAssetBalanceByAccount = selectPortfolioCryptoBalanceByAssetId(state, ethCaip19)
      expect(cryptoAssetBalanceByAccount).toBe(state.portfolio.assetBalances.byId[ethCaip19])
    })
  })

  describe('selectPortfolioAllocationPercentByAccountId', () => {
    it('can select fiat allocation by accountId', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, btcAccount } = mockETHandBTCAccounts()

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount])
        )
      )

      const ethMarketData = mockMarketData()
      const foxMarketData = mockMarketData({
        price: '1'
      })

      // dispatch market data
      store.dispatch(
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData
        })
      )

      const assetData = mockAssetState()

      store.dispatch(assetsSlice.actions.setAssets(assetData))

      const ethAccountId = `${ethAccount.caip2}:${toLower(ethAccount.pubkey)}`
      const state = store.getState()

      const returnValue = 60

      const allocationByAccountId = selectPortfolioAllocationPercentByAccountId(state, ethAccountId)
      expect(allocationByAccountId).toEqual(returnValue)
    })

    it('should return 0 for allocation if no market data is available', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, btcAccount } = mockETHandBTCAccounts()

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount])
        )
      )

      const ethMarketData = mockMarketData({
        price: null,
      })

      const foxMarketData = mockMarketData({
        price: null
      })

      // dispatch market data
      store.dispatch(
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData
        })
      )

      const assetData = mockAssetState()

      store.dispatch(assetsSlice.actions.setAssets(assetData))

      const ethAccountId = `${ethAccount.caip2}:${toLower(ethAccount.pubkey)}`
      const state = store.getState()

      const allocationByAccountId = selectPortfolioAllocationPercentByAccountId(state, ethAccountId)

      expect(allocationByAccountId).toEqual(0)
    })
  })

  // START HERE
  describe.skip('Fiat Balance Selectors', () => {
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
})
