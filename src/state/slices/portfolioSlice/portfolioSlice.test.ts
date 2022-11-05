import { btcAssetId, ethAssetId, foxAssetId } from '@keepkey/caip'
import {
  assetIds,
  btcAddresses,
  btcPubKeys,
  ethPubKeys,
  mockBtcAccount,
  mockBtcAddress,
  mockEthAccount,
  mockEthAndBtcAccounts,
  mockEthToken,
  unknown1AssetId,
  unknown2AssetId,
  unknown3AssetId,
  usdcAssetId,
  yvusdcAssetId,
  zeroAssetId,
} from 'test/mocks/accounts'
import { mockAssetState } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { mockChainAdapters, mockUpsertPortfolio } from 'test/mocks/portfolio'
import { createStore } from 'state/store'

import { assets as assetsSlice } from '../assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from '../marketDataSlice/marketDataSlice'
import { portfolio as portfolioSlice } from './portfolioSlice'
import {
  selectHighestFiatBalanceAccountByAssetId,
  selectPortfolioAccountIdsSortedFiat,
  selectPortfolioAccountRows,
  selectPortfolioAllocationPercentByFilter,
  selectPortfolioAssetAccounts,
  selectPortfolioAssetIdsByAccountId,
  selectPortfolioAssetIdsByAccountIdExcludeFeeAsset,
  selectPortfolioCryptoBalanceByAssetId,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatAccountBalances,
  selectPortfolioFiatBalanceByFilter,
  selectPortfolioTotalFiatBalanceByAccount,
} from './selectors'

jest.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('portfolioSlice', () => {
  const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => void 0)
  afterAll(() => consoleInfoSpy.mockRestore())
  describe('reducers', () => {
    describe('upsertPortfolio', () => {
      describe('ethereum', () => {
        it('should update state', () => {
          const store = createStore()
          const ethAccount = mockEthAccount({
            chainSpecific: {
              nonce: 1,
              tokens: [mockEthToken({ balance: '1', assetId: foxAssetId })],
            },
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(mockUpsertPortfolio([ethAccount], assetIds)),
          )

          expect(store.getState().portfolio).toMatchSnapshot()
        })

        it('should update state with multiple accounts', () => {
          const store = createStore()
          const ethAccount = mockEthAccount({
            chainSpecific: {
              nonce: 1,
              tokens: [mockEthToken({ balance: '1', assetId: foxAssetId })],
            },
          })

          const ethAccount2 = mockEthAccount({
            balance: '10',
            pubkey: ethPubKeys[1],
            chainSpecific: {
              nonce: 1,
              tokens: [mockEthToken({ balance: '2', assetId: usdcAssetId })],
            },
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
            ),
          )

          expect(store.getState().portfolio).toMatchSnapshot()
        })
      })

      describe('Bitcoin', () => {
        it('should update state', () => {
          const store = createStore()
          const btcAccount = mockBtcAccount({
            chainSpecific: {
              addresses: [mockBtcAddress({ balance: '3' })],
            },
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(mockUpsertPortfolio([btcAccount], assetIds)),
          )

          expect(store.getState().portfolio).toMatchSnapshot()
        })

        it('should update state with multiple bitcoin accounts', () => {
          const store = createStore()
          const btcAccount = mockBtcAccount({
            chainSpecific: {
              addresses: [mockBtcAddress({ balance: '3' })],
            },
          })

          const btcAccount2 = mockBtcAccount({
            pubkey: btcPubKeys[1],
            chainSpecific: {
              addresses: [mockBtcAddress({ balance: '4', pubkey: btcAddresses[1] })],
            },
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              mockUpsertPortfolio([btcAccount, btcAccount2], assetIds),
            ),
          )

          expect(store.getState().portfolio).toMatchSnapshot()
        })
      })

      describe('Ethereum and bitcoin', () => {
        it('should update state', () => {
          const store = createStore()
          const { ethAccount, ethAccount2, btcAccount } = mockEthAndBtcAccounts({
            ethAccountObj: {
              balance: '27803816548287370',
              chainSpecific: {
                nonce: 5,
                tokens: [
                  mockEthToken({ balance: '42729243327349401946', assetId: foxAssetId }),
                  mockEthToken({ balance: '41208456', assetId: usdcAssetId }),
                  mockEthToken({ balance: '8178352', assetId: yvusdcAssetId }),
                ],
              },
              pubkey: ethPubKeys[0],
            },
            ethAccount2Obj: {
              balance: '23803816548287370',
              chainSpecific: {
                nonce: 5,
                tokens: [
                  mockEthToken({ balance: '40729243327349401946', assetId: foxAssetId }),
                  mockEthToken({ balance: '41208456', assetId: usdcAssetId }),
                  mockEthToken({ balance: '8178352', assetId: yvusdcAssetId }),
                ],
              },
              pubkey: ethPubKeys[1],
            },
            btcAccountObj: {
              balance: '1010',
              chainSpecific: {
                addresses: [
                  mockBtcAddress({ balance: '1000', pubkey: btcAddresses[0] }),
                  mockBtcAddress({ balance: '0', pubkey: btcAddresses[1] }),
                  mockBtcAddress({ balance: '10', pubkey: btcAddresses[2] }),
                  mockBtcAddress({ balance: '0', pubkey: btcAddresses[3] }),
                ],
              },
            },
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount], assetIds),
            ),
          )

          expect(store.getState().portfolio).toMatchSnapshot()
        })

        it('should update state and exclude unknown asset ids', () => {
          const store = createStore()
          const { ethAccount, btcAccount } = mockEthAndBtcAccounts({
            ethAccountObj: {
              balance: '23803816548287371',
              chainSpecific: {
                nonce: 5,
                tokens: [
                  mockEthToken({ balance: '4516123', assetId: unknown1AssetId }),
                  mockEthToken({ balance: '8178312', assetId: yvusdcAssetId }),
                  mockEthToken({ balance: '4516124', assetId: unknown2AssetId }),
                  mockEthToken({ balance: '41208442', assetId: usdcAssetId }),
                  mockEthToken({ balance: '4516125', assetId: unknown3AssetId }),
                  mockEthToken({ balance: '40729243327349401958', assetId: foxAssetId }),
                  mockEthToken({ balance: '4516126', assetId: zeroAssetId }),
                ],
              },
              pubkey: ethPubKeys[2],
            },
            btcAccountObj: {
              balance: '1010',
              chainSpecific: {
                addresses: [
                  mockBtcAddress({ balance: '1000', pubkey: btcAddresses[0] }),
                  mockBtcAddress({ balance: '0', pubkey: btcAddresses[1] }),
                  mockBtcAddress({ balance: '10', pubkey: btcAddresses[2] }),
                  mockBtcAddress({ balance: '0', pubkey: btcAddresses[3] }),
                ],
              },
            },
          })

          store.dispatch(
            portfolioSlice.actions.upsertPortfolio(
              mockUpsertPortfolio([ethAccount, btcAccount], assetIds),
            ),
          )

          expect(store.getState().portfolio).toMatchSnapshot()
        })
      })
    })
  })

  describe('selectors', () => {
    describe('selectPortfolioAssetAccounts', () => {
      it('can get accounts containing an asset', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts()

        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
          ),
        )
        const state = store.getState()

        const selected = selectPortfolioAssetAccounts(state, ethAssetId)
        const expected = [ethAccountId, ethAccount2Id]
        expect(selected).toEqual(expected)
      })
    })

    describe('selectPortfolioAssetCryptoBalanceByAssetId', () => {
      const store = createStore()
      const { ethAccount, btcAccount } = mockEthAndBtcAccounts()

      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, btcAccount], assetIds),
        ),
      )
      const state = store.getState()

      it('can select crypto asset balance by asset Id', () => {
        const cryptoAssetBalanceByAccount = selectPortfolioCryptoBalanceByAssetId(state, {
          assetId: ethAssetId,
        })
        expect(cryptoAssetBalanceByAccount).toBe(state.portfolio.assetBalances.byId[ethAssetId])
      })
    })

    describe('selectPortfolioAllocationPercentByFilter', () => {
      it('can select fiat allocation by accountId', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, btcAccount, ethAccountId } = mockEthAndBtcAccounts()

        // dispatch portfolio data
        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount], assetIds),
          ),
        )

        const ethMarketData = mockMarketData()
        const foxMarketData = mockMarketData({ price: '1' })

        // dispatch market data
        store.dispatch(
          marketDataSlice.actions.setCryptoMarketData({
            [ethAssetId]: ethMarketData,
            [foxAssetId]: foxMarketData,
          }),
        )

        // dispatch asset data
        const assetData = mockAssetState()
        store.dispatch(assetsSlice.actions.setAssets(assetData))
        const state = store.getState()

        const allocationByAccountId = selectPortfolioAllocationPercentByFilter(state, {
          accountId: ethAccountId,
          assetId: foxAssetId,
        })

        expect(allocationByAccountId).toEqual(60)
      })

      it('should return 0 for allocation if no market data is available', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, btcAccount, ethAccountId } = mockEthAndBtcAccounts()

        // dispatch portfolio data
        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount], assetIds),
          ),
        )
        const ethMarketData = mockMarketData({ price: null })
        const foxMarketData = mockMarketData({ price: null })

        // dispatch market data
        store.dispatch(
          marketDataSlice.actions.setCryptoMarketData({
            [ethAssetId]: ethMarketData,
            [foxAssetId]: foxMarketData,
          }),
        )

        // dispatch asset data
        const assetData = mockAssetState()
        store.dispatch(assetsSlice.actions.setAssets(assetData))
        const state = store.getState()

        const allocationByAccountId = selectPortfolioAllocationPercentByFilter(state, {
          accountId: ethAccountId,
          assetId: foxAssetId,
        })

        expect(allocationByAccountId).toEqual(0)
      })
    })

    describe('selectPortfolioFiatAccountBalance', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: { balance: '1000000000000000000' },
        ethAccount2Obj: { balance: '200000000000000000' },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      it('can select crypto fiat account balance', () => {
        // dispatch market data
        const ethMarketData = mockMarketData({ price: '1000' })
        const foxMarketData = mockMarketData({ price: '10' })
        const usdcMarketData = mockMarketData({ price: '1' })

        store.dispatch(
          marketDataSlice.actions.setCryptoMarketData({
            [ethAssetId]: ethMarketData,
            [foxAssetId]: foxMarketData,
            [usdcAssetId]: usdcMarketData,
          }),
        )

        // dispatch asset data
        const assetData = mockAssetState()
        store.dispatch(assetsSlice.actions.setAssets(assetData))
        const state = store.getState()

        const returnValue = {
          [ethAccountId]: {
            [ethAssetId]: '1000.00',
            [foxAssetId]: '30.00',
            [usdcAssetId]: '10.00',
          },
          [ethAccount2Id]: {
            [ethAssetId]: '200.00',
            [foxAssetId]: '20.00',
          },
        }

        const fiatAccountBalance = selectPortfolioFiatAccountBalances(state)
        expect(fiatAccountBalance).toEqual(returnValue)
      })

      it('returns 0 when no market data is available', () => {
        store.dispatch(marketDataSlice.actions.clear())
        const state = store.getState()

        const returnValue = {
          [ethAccountId]: {
            [ethAssetId]: '0.00',
            [foxAssetId]: '0.00',
            [usdcAssetId]: '0.00',
          },
          [ethAccount2Id]: {
            [ethAssetId]: '0.00',
            [foxAssetId]: '0.00',
          },
        }

        const fiatAccountBalance = selectPortfolioFiatAccountBalances(state)
        expect(fiatAccountBalance).toEqual(returnValue)
      })
    })

    describe('selectHighestFiatBalanceAccountByAssetId', () => {
      const store = createStore()
      const { btcAccount, btcAccount2, btcAccount3 } = mockEthAndBtcAccounts()

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([btcAccount, btcAccount2, btcAccount3], assetIds),
        ),
      )

      // dispatch market data
      const btcMarketData = mockMarketData({ price: '10000' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [btcAssetId]: btcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))

      it('can select highest value account by assetId', () => {
        const state = store.getState()
        const highestValueAccount = selectHighestFiatBalanceAccountByAssetId(state, {
          assetId: btcAssetId,
        })

        const expectedHighestValueAccount =
          'bip122:000000000019d6689c085ae165831e93:ypub6qk8s2NQsYG6X2Mm6iU2ii3yTAqDb2XqnMu9vo2WjvqwjSvjjiYQQveYXbPxrnRT5Yb5p0x934be745172066EDF795ffc5EA9F28f19b440c637BaBw1wowPwbS8fj7uCfj3UhqhD2LLbvY6Ni1w'
        expect(highestValueAccount).toEqual(expectedHighestValueAccount)
      })
    })

    describe('selectPortfolioFiatBalanceByFilter', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId } = mockEthAndBtcAccounts({
        ethAccountObj: { balance: '1000009000000000000' },
        ethAccount2Obj: { balance: '200000000000000000' },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '10' })
      const usdcMarketData = mockMarketData({ price: '1' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should be able to filter by assetId', () => {
        const expected = '1200.01'
        const result = selectPortfolioFiatBalanceByFilter(state, { assetId: ethAssetId })
        expect(result).toEqual(expected)
      })

      it('should be able to filter by accountId and assetId', () => {
        const expected = '30.00'
        const result = selectPortfolioFiatBalanceByFilter(state, {
          accountId: ethAccountId,
          assetId: foxAssetId,
        })
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioCryptoHumanBalancesByFilter', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: { balance: '1000009000000000000' },
        ethAccount2Obj: {
          balance: '200000000000000000',
          chainSpecific: {
            tokens: [mockEthToken({ balance: '200100000000000000' })],
          },
        },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '10' })
      const usdcMarketData = mockMarketData({ price: '1' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should be able to filter by assetId', () => {
        const expected = '1.200009'
        const result = selectPortfolioCryptoHumanBalanceByFilter(state, { assetId: ethAssetId })
        expect(result).toEqual(expected)
      })

      it('should be able to filter by accountId and assetId', () => {
        const expected = '0.2001'
        const result = selectPortfolioCryptoHumanBalanceByFilter(state, {
          accountId: ethAccount2Id,
          assetId: foxAssetId,
        })
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioTotalFiatBalanceByAccount', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxAssetId }),
              mockEthToken({ balance: '1000000', assetId: usdcAssetId }),
            ],
          },
        },
        ethAccount2Obj: { balance: '2000000000000000000' },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '10' })
      const usdcMarketData = mockMarketData({ price: '1' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return total fiat balance by accountId', () => {
        const expected = {
          [ethAccountId]: '1011.00',
          [ethAccount2Id]: '2020.00',
        }

        const result = selectPortfolioTotalFiatBalanceByAccount(state)
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioTokenIdsByAccountId', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId } = mockEthAndBtcAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxAssetId }),
              mockEthToken({ balance: '1000000', assetId: usdcAssetId }),
            ],
          },
        },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '10' })
      const usdcMarketData = mockMarketData({ price: '1' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return an array of assetIds by accountId', () => {
        const expected = [ethAssetId, foxAssetId, usdcAssetId]
        const result = selectPortfolioAssetIdsByAccountId(state, { accountId: ethAccountId })

        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioAccountIdsSortedFiat', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxAssetId }),
              mockEthToken({ balance: '1000000', assetId: usdcAssetId }),
            ],
          },
        },
        ethAccount2Obj: { balance: '10000000000' },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '10' })
      const usdcMarketData = mockMarketData({ price: '1' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return an array of account IDs sorted by fiat balance', () => {
        const expected = [ethAccountId, ethAccount2Id]
        const result = selectPortfolioAccountIdsSortedFiat(state)

        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioAssetIdsByAccountIdExcludeFeeAsset', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId } = mockEthAndBtcAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxAssetId }),
              mockEthToken({ balance: '1000000', assetId: usdcAssetId }),
              mockEthToken({ balance: '1000000000000000000', assetId: zeroAssetId }),
            ],
          },
        },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
        ),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '10' })
      const usdcMarketData = mockMarketData({ price: '1' })
      const zeroMarketData = mockMarketData({ price: '100' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
          [zeroAssetId]: zeroMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return assetIds (excluding fee assets, ie Ethereum) of a given account, sorted by fiat value', () => {
        const expected = [zeroAssetId, foxAssetId, usdcAssetId]
        const result = selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, {
          accountId: ethAccountId,
        })

        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioAccountRows', () => {
      const store = createStore()
      const { ethAccount } = mockEthAndBtcAccounts({
        ethAccountObj: {
          balance: '0',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '123456123456315537', assetId: foxAssetId }),
              mockEthToken({ balance: '0', assetId: usdcAssetId }),
            ],
          },
        },
      })

      // dispatch portfolio data
      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(mockUpsertPortfolio([ethAccount], assetIds)),
      )

      // dispatch market data
      const ethMarketData = mockMarketData({ price: '1000' })
      const foxMarketData = mockMarketData({ price: '31.39' })
      const usdcMarketData = mockMarketData({ price: '1' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [ethAssetId]: ethMarketData,
          [foxAssetId]: foxMarketData,
          [usdcAssetId]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return correct portfolio rows in case of 100% allocation on one asset', () => {
        const result = selectPortfolioAccountRows(state)
        expect(result).toMatchSnapshot()
      })
    })
  })
})
