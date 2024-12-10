import { btcAssetId, ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import type { BIP44Params } from '@shapeshiftoss/types'
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
import { afterAll, describe, expect, it, vi } from 'vitest'
import { createStore } from 'state/store'

import { assets as assetsSlice } from '../assetsSlice/assetsSlice'
import {
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectPortfolioUserCurrencyBalancesByAccountId,
} from '../common-selectors'
import { marketData as marketDataSlice } from '../marketDataSlice/marketDataSlice'
import { portfolio as portfolioSlice } from './portfolioSlice'
import {
  selectHighestUserCurrencyBalanceAccountByAssetId,
  selectPortfolioAccountRows,
  selectPortfolioAllocationPercentByFilter,
  selectPortfolioAssetIdsByAccountIdExcludeFeeAsset,
  selectPortfolioUserCurrencyBalanceByFilter,
} from './selectors'

vi.mock('context/PluginProvider/chainAdapterSingleton', () => ({
  getChainAdapterManager: () => mockChainAdapters,
}))

describe('portfolioSlice', () => {
  const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => void 0)
  afterAll(() => consoleInfoSpy.mockRestore())
  const bip44Params: BIP44Params = {
    purpose: 0,
    coinType: 0,
    accountNumber: 0,
    isChange: false,
    index: 0,
  }

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

          const portfolio = mockUpsertPortfolio([ethAccount], assetIds)
          store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

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

          const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2], assetIds)
          store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

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

          const portfolio = mockUpsertPortfolio([btcAccount], assetIds)
          store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

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

          const portfolio = mockUpsertPortfolio([btcAccount, btcAccount2], assetIds)
          store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

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

          const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount], assetIds)
          store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

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

          const portfolio = mockUpsertPortfolio([ethAccount, btcAccount], assetIds)
          store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))

          expect(store.getState().portfolio).toMatchSnapshot()
        })
      })
    })
  })

  describe('selectors', () => {
    describe('selectPortfolioAllocationPercentByFilter', () => {
      it('can select fiat allocation by accountId', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, btcAccount, ethAccountId, ethAccount2Id, btcAccountId } =
          mockEthAndBtcAccounts()

        store.dispatch(
          portfolioSlice.actions.setWalletMeta({
            walletId: 'fakeWalletId',
            walletName: 'fakeWalletName',
          }),
        )
        store.dispatch(
          portfolioSlice.actions.upsertAccountMetadata({
            walletId: 'fakeWalletId',
            accountMetadataByAccountId: {
              [ethAccountId]: { bip44Params },
              [ethAccount2Id]: { bip44Params },
              [btcAccountId]: { bip44Params },
            },
          }),
        )

        // dispatch portfolio data
        const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount], assetIds)
        store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
        for (const accountId of portfolio.accounts.ids) {
          store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
        }

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
        store.dispatch(assetsSlice.actions.upsertAssets(assetData))
        const state = store.getState()

        const allocationByAccountId = selectPortfolioAllocationPercentByFilter(state, {
          accountId: ethAccountId,
          assetId: foxAssetId,
        })

        expect(allocationByAccountId).toEqual(60)
      })

      it('should return 0 for allocation if no market data is available', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, btcAccount, ethAccountId, ethAccount2Id, btcAccountId } =
          mockEthAndBtcAccounts()

        store.dispatch(
          portfolioSlice.actions.setWalletMeta({
            walletId: 'fakeWalletId',
            walletName: 'fakeWalletName',
          }),
        )
        store.dispatch(
          portfolioSlice.actions.upsertAccountMetadata({
            walletId: 'fakeWalletId',
            accountMetadataByAccountId: {
              [ethAccountId]: { bip44Params },
              [ethAccount2Id]: { bip44Params },
              [btcAccountId]: { bip44Params },
            },
          }),
        )

        // dispatch portfolio data
        const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2, btcAccount], assetIds)
        store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
        for (const accountId of portfolio.accounts.ids) {
          store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
        }

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
        store.dispatch(assetsSlice.actions.upsertAssets(assetData))
        const state = store.getState()

        const allocationByAccountId = selectPortfolioAllocationPercentByFilter(state, {
          accountId: ethAccountId,
          assetId: foxAssetId,
        })

        expect(allocationByAccountId).toEqual(0)
      })
    })

    describe('selectPortfolioUserCurrencyBalancesByAccountId', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: { balance: '1000000000000000000' },
        ethAccount2Obj: { balance: '200000000000000000' },
      })

      store.dispatch(
        portfolioSlice.actions.setWalletMeta({
          walletId: 'fakeWalletId',
          walletName: 'fakeWalletName',
        }),
      )
      store.dispatch(
        portfolioSlice.actions.upsertAccountMetadata({
          walletId: 'fakeWalletId',
          accountMetadataByAccountId: {
            [ethAccountId]: { bip44Params },
            [ethAccount2Id]: { bip44Params },
          },
        }),
      )

      // dispatch portfolio data
      const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2], assetIds)
      store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
      for (const accountId of portfolio.accounts.ids) {
        store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
      }

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
        store.dispatch(assetsSlice.actions.upsertAssets(assetData))
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

        const userCurrencyAccountBalance = selectPortfolioUserCurrencyBalancesByAccountId(state)
        expect(userCurrencyAccountBalance).toEqual(returnValue)
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

        const userCurrencyAccountBalance = selectPortfolioUserCurrencyBalancesByAccountId(state)
        expect(userCurrencyAccountBalance).toEqual(returnValue)
      })
    })

    describe('selectHighestUserCurrencyBalanceAccountByAssetId', () => {
      const store = createStore()
      const { btcAccount, btcAccount2, btcAccount3, btcAccountId, btcAccount2Id, btcAccount3Id } =
        mockEthAndBtcAccounts()

      store.dispatch(
        portfolioSlice.actions.setWalletMeta({
          walletId: 'fakeWalletId',
          walletName: 'fakeWalletName',
        }),
      )
      store.dispatch(
        portfolioSlice.actions.upsertAccountMetadata({
          walletId: 'fakeWalletId',
          accountMetadataByAccountId: {
            [btcAccountId]: { bip44Params },
            [btcAccount2Id]: { bip44Params },
            [btcAccount3Id]: { bip44Params },
          },
        }),
      )

      // dispatch portfolio data
      const portfolio = mockUpsertPortfolio([btcAccount, btcAccount2, btcAccount3], assetIds)
      store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
      for (const accountId of portfolio.accounts.ids) {
        store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
      }

      // dispatch market data
      const btcMarketData = mockMarketData({ price: '10000' })

      store.dispatch(
        marketDataSlice.actions.setCryptoMarketData({
          [btcAssetId]: btcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.upsertAssets(assetData))

      it('can select highest value account by assetId', () => {
        const state = store.getState()
        const highestValueAccount = selectHighestUserCurrencyBalanceAccountByAssetId(state, {
          assetId: btcAssetId,
        })

        const expectedHighestValueAccount =
          'bip122:000000000019d6689c085ae165831e93:ypub6qk8s2NQsYG6X2Mm6iU2ii3yTAqDb2XqnMu9vo2WjvqwjSvjjiYQQveYXbPxrnRT5Yb5p0x934be745172066EDF795ffc5EA9F28f19b440c637BaBw1wowPwbS8fj7uCfj3UhqhD2LLbvY6Ni1w'
        expect(highestValueAccount).toEqual(expectedHighestValueAccount)
      })
    })

    describe('selectPortfolioFiatBalanceByFilter', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: { balance: '1000009000000000000' },
        ethAccount2Obj: { balance: '200000000000000000' },
      })

      store.dispatch(
        portfolioSlice.actions.setWalletMeta({
          walletId: 'fakeWalletId',
          walletName: 'fakeWalletName',
        }),
      )
      // dispatch portfolio data
      const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2], assetIds)
      store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
      for (const accountId of portfolio.accounts.ids) {
        store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
      }

      store.dispatch(
        portfolioSlice.actions.upsertAccountMetadata({
          walletId: 'fakeWalletId',
          accountMetadataByAccountId: {
            [ethAccountId]: { bip44Params },
            [ethAccount2Id]: { bip44Params },
          },
        }),
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
      store.dispatch(assetsSlice.actions.upsertAssets(assetData))
      const state = store.getState()

      it('should be able to filter by assetId', () => {
        const expected = '1200.01'
        const result = selectPortfolioUserCurrencyBalanceByFilter(state, { assetId: ethAssetId })
        expect(result).toEqual(expected)
      })

      it('should be able to filter by accountId and assetId', () => {
        const expected = '30.00'
        const result = selectPortfolioUserCurrencyBalanceByFilter(state, {
          accountId: ethAccountId,
          assetId: foxAssetId,
        })
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioCryptoPrecisionBalanceByFilter', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
        ethAccountObj: { balance: '1000009000000000000' },
        ethAccount2Obj: {
          balance: '200000000000000000',
          chainSpecific: {
            tokens: [mockEthToken({ balance: '200100000000000000' })],
          },
        },
      })

      store.dispatch(
        portfolioSlice.actions.setWalletMeta({
          walletId: 'fakeWalletId',
          walletName: 'fakeWalletName',
        }),
      )
      store.dispatch(
        portfolioSlice.actions.upsertAccountMetadata({
          walletId: 'fakeWalletId',
          accountMetadataByAccountId: {
            [ethAccountId]: { bip44Params },
            [ethAccount2Id]: { bip44Params },
          },
        }),
      )

      // dispatch portfolio data
      const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2], assetIds)
      store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
      for (const accountId of portfolio.accounts.ids) {
        store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
      }

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
      store.dispatch(assetsSlice.actions.upsertAssets(assetData))
      const state = store.getState()

      it('should be able to filter by assetId', () => {
        const expected = '1.200009'
        const result = selectPortfolioCryptoPrecisionBalanceByFilter(state, { assetId: ethAssetId })
        expect(result).toEqual(expected)
      })

      it('should be able to filter by accountId and assetId', () => {
        const expected = '0.2001'
        const result = selectPortfolioCryptoPrecisionBalanceByFilter(state, {
          accountId: ethAccount2Id,
          assetId: foxAssetId,
        })
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioAssetIdsByAccountIdExcludeFeeAsset', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockEthAndBtcAccounts({
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

      store.dispatch(
        portfolioSlice.actions.setWalletMeta({
          walletId: 'fakeWalletId',
          walletName: 'fakeWalletName',
        }),
      )
      store.dispatch(
        portfolioSlice.actions.upsertAccountMetadata({
          walletId: 'fakeWalletId',
          accountMetadataByAccountId: {
            [ethAccountId]: { bip44Params },
            [ethAccount2Id]: { bip44Params },
          },
        }),
      )

      // dispatch portfolio data
      const portfolio = mockUpsertPortfolio([ethAccount, ethAccount2], assetIds)
      store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
      for (const accountId of portfolio.accounts.ids) {
        store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
      }

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
      store.dispatch(assetsSlice.actions.upsertAssets(assetData))
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
      const portfolio = mockUpsertPortfolio([ethAccount], assetIds)
      store.dispatch(portfolioSlice.actions.upsertPortfolio(portfolio))
      for (const accountId of portfolio.accounts.ids) {
        store.dispatch(portfolioSlice.actions.enableAccountId(accountId))
      }

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
      store.dispatch(assetsSlice.actions.upsertAssets(assetData))
      const state = store.getState()

      it('should return correct portfolio rows in case of 100% allocation on one asset', () => {
        const result = selectPortfolioAccountRows(state)
        expect(result).toMatchSnapshot()
      })
    })
  })
})
