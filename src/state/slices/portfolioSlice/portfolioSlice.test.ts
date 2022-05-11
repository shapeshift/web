import merge from 'lodash/merge'
import {
  assetIds,
  btcAddresses,
  btcCaip10s,
  btcPubKeys,
  cosmosCaip19,
  ethCaip10s,
  ethCaip19,
  ethPubKeys,
  foxCaip19,
  mockBtcAccount,
  mockBtcAddress,
  mockCosmosAccount,
  mockCosmosAccountWithOnlyUndelegations,
  mockCosmosAccountWithStakingData,
  mockEthAccount,
  mockETHandBTCAccounts,
  mockEthToken,
  unknown1Caip19,
  unknown2Caip19,
  unknown3Caip19,
  usdcCaip19,
  yvusdcCaip19,
  zeroCaip19,
} from 'test/mocks/accounts'
import { cosmos, mockAssetState } from 'test/mocks/assets'
import { mockMarketData } from 'test/mocks/marketData'
import { mockUpsertPortfolio } from 'test/mocks/portfolio'
import { createStore } from 'state/store'

import { assets as assetsSlice } from '../assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from '../marketDataSlice/marketDataSlice'
import { portfolio as portfolioSlice } from './portfolioSlice'
import {
  selectAccountIdByAddress,
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
  selectTotalFiatBalanceWithDelegations,
} from './selectors'

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
              tokens: [mockEthToken({ balance: '1', assetId: foxCaip19 })],
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
              tokens: [mockEthToken({ balance: '1', assetId: foxCaip19 })],
            },
          })

          const ethAccount2 = mockEthAccount({
            balance: '10',
            pubkey: ethPubKeys[1],
            chainSpecific: {
              nonce: 1,
              tokens: [mockEthToken({ balance: '2', assetId: usdcCaip19 })],
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
          const { ethAccount, ethAccount2, btcAccount } = mockETHandBTCAccounts({
            ethAccountObj: {
              balance: '27803816548287370',
              chainSpecific: {
                nonce: 5,
                tokens: [
                  mockEthToken({ balance: '42729243327349401946', assetId: foxCaip19 }),
                  mockEthToken({ balance: '41208456', assetId: usdcCaip19 }),
                  mockEthToken({ balance: '8178352', assetId: yvusdcCaip19 }),
                ],
              },
              pubkey: ethPubKeys[0],
            },
            ethAccount2Obj: {
              balance: '23803816548287370',
              chainSpecific: {
                nonce: 5,
                tokens: [
                  mockEthToken({ balance: '40729243327349401946', assetId: foxCaip19 }),
                  mockEthToken({ balance: '41208456', assetId: usdcCaip19 }),
                  mockEthToken({ balance: '8178352', assetId: yvusdcCaip19 }),
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
          const { ethAccount, btcAccount } = mockETHandBTCAccounts({
            ethAccountObj: {
              balance: '23803816548287371',
              chainSpecific: {
                nonce: 5,
                tokens: [
                  mockEthToken({ balance: '4516123', assetId: unknown1Caip19 }),
                  mockEthToken({ balance: '8178312', assetId: yvusdcCaip19 }),
                  mockEthToken({ balance: '4516124', assetId: unknown2Caip19 }),
                  mockEthToken({ balance: '41208442', assetId: usdcCaip19 }),
                  mockEthToken({ balance: '4516125', assetId: unknown3Caip19 }),
                  mockEthToken({ balance: '40729243327349401958', assetId: foxCaip19 }),
                  mockEthToken({ balance: '4516126', assetId: zeroCaip19 }),
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
        const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockETHandBTCAccounts()

        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([ethAccount, ethAccount2], assetIds),
          ),
        )
        const state = store.getState()

        const selected = selectPortfolioAssetAccounts(state, ethCaip19)
        const expected = [ethAccountId, ethAccount2Id]
        expect(selected).toEqual(expected)
      })
    })

    describe('selectAccountIdByAddress', () => {
      const store = createStore()
      const { ethAccount, btcAccount, ethAccountId, btcAccountId } = mockETHandBTCAccounts()

      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, btcAccount], assetIds),
        ),
      )
      const state = store.getState()

      it('can select account id by address (CAIP10)', () => {
        const btcAccSpecifier = selectAccountIdByAddress(state, { accountSpecifier: btcCaip10s[0] })
        const ethAccSpecifier = selectAccountIdByAddress(state, { accountSpecifier: ethCaip10s[0] })

        expect(btcAccSpecifier).toEqual(btcAccountId)
        expect(ethAccSpecifier).toEqual(ethAccountId)
      })

      it('can select account id with address in non checksum format', () => {
        // caip10s in state in non checksum format
        const btcAccSpecifier = selectAccountIdByAddress(state, { accountSpecifier: btcCaip10s[0] })
        expect(btcAccSpecifier).toEqual(btcAccountId)

        // caip10 argument in non checksum format
        const ethAccSpecifier = selectAccountIdByAddress(state, {
          accountSpecifier: ethCaip10s[0].toUpperCase(),
        })
        expect(ethAccSpecifier).toEqual(ethAccountId)
      })
    })

    describe('selectPortfolioAssetCryptoBalanceByAssetId', () => {
      const store = createStore()
      const { ethAccount, btcAccount } = mockETHandBTCAccounts()

      store.dispatch(
        portfolioSlice.actions.upsertPortfolio(
          mockUpsertPortfolio([ethAccount, btcAccount], assetIds),
        ),
      )
      const state = store.getState()

      it('can select crypto asset balance by asset Id', () => {
        const cryptoAssetBalanceByAccount = selectPortfolioCryptoBalanceByAssetId(state, {
          assetId: ethCaip19,
        })
        expect(cryptoAssetBalanceByAccount).toBe(state.portfolio.assetBalances.byId[ethCaip19])
      })
    })

    describe('selectPortfolioAllocationPercentByFilter', () => {
      it('can select fiat allocation by accountId', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, btcAccount, ethAccountId } = mockETHandBTCAccounts()

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
          marketDataSlice.actions.setMarketData({
            [ethCaip19]: ethMarketData,
            [foxCaip19]: foxMarketData,
          }),
        )

        // dispatch asset data
        const assetData = mockAssetState()
        store.dispatch(assetsSlice.actions.setAssets(assetData))
        const state = store.getState()

        const allocationByAccountId = selectPortfolioAllocationPercentByFilter(state, {
          accountId: ethAccountId,
          assetId: foxCaip19,
        })

        expect(allocationByAccountId).toEqual(60)
      })

      it('should return 0 for allocation if no market data is available', () => {
        const store = createStore()
        const { ethAccount, ethAccount2, btcAccount, ethAccountId } = mockETHandBTCAccounts()

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
          marketDataSlice.actions.setMarketData({
            [ethCaip19]: ethMarketData,
            [foxCaip19]: foxMarketData,
          }),
        )

        // dispatch asset data
        const assetData = mockAssetState()
        store.dispatch(assetsSlice.actions.setAssets(assetData))
        const state = store.getState()

        const allocationByAccountId = selectPortfolioAllocationPercentByFilter(state, {
          accountId: ethAccountId,
          assetId: foxCaip19,
        })

        expect(allocationByAccountId).toEqual(0)
      })
    })

    describe('selectPortfolioFiatAccountBalance', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockETHandBTCAccounts({
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
          marketDataSlice.actions.setMarketData({
            [ethCaip19]: ethMarketData,
            [foxCaip19]: foxMarketData,
            [usdcCaip19]: usdcMarketData,
          }),
        )

        // dispatch asset data
        const assetData = mockAssetState()
        store.dispatch(assetsSlice.actions.setAssets(assetData))
        const state = store.getState()

        const returnValue = {
          [ethAccountId]: {
            [ethCaip19]: '1000.00',
            [foxCaip19]: '30.00',
            [usdcCaip19]: '10.00',
          },
          [ethAccount2Id]: {
            [ethCaip19]: '200.00',
            [foxCaip19]: '20.00',
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
            [ethCaip19]: '0.00',
            [foxCaip19]: '0.00',
            [usdcCaip19]: '0.00',
          },
          [ethAccount2Id]: {
            [ethCaip19]: '0.00',
            [foxCaip19]: '0.00',
          },
        }

        const fiatAccountBalance = selectPortfolioFiatAccountBalances(state)
        expect(fiatAccountBalance).toEqual(returnValue)
      })
    })

    describe('selectPortfolioFiatBalanceByFilter', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId } = mockETHandBTCAccounts({
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should be able to filter by assetId', () => {
        const expected = '1200.01'
        const result = selectPortfolioFiatBalanceByFilter(state, { assetId: ethCaip19 })
        expect(result).toEqual(expected)
      })

      it('should be able to filter by accountId and assetId', () => {
        const expected = '30.00'
        const result = selectPortfolioFiatBalanceByFilter(state, {
          accountId: ethAccountId,
          assetId: foxCaip19,
        })
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioCryptoHumanBalancesByFilter', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccount2Id } = mockETHandBTCAccounts({
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should be able to filter by assetId', () => {
        const expected = '1.200009'
        const result = selectPortfolioCryptoHumanBalanceByFilter(state, { assetId: ethCaip19 })
        expect(result).toEqual(expected)
      })

      it('should be able to filter by accountId and assetId', () => {
        const expected = '0.2001'
        const result = selectPortfolioCryptoHumanBalanceByFilter(state, {
          accountId: ethAccount2Id,
          assetId: foxCaip19,
        })
        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioTotalFiatBalanceByAccount', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockETHandBTCAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxCaip19 }),
              mockEthToken({ balance: '1000000', assetId: usdcCaip19 }),
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
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
      const { ethAccount, ethAccount2, ethAccountId } = mockETHandBTCAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxCaip19 }),
              mockEthToken({ balance: '1000000', assetId: usdcCaip19 }),
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return an array of assetIds (caip19) by accountId', () => {
        const expected = [ethCaip19, foxCaip19, usdcCaip19]
        const result = selectPortfolioAssetIdsByAccountId(state, { accountId: ethAccountId })

        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioAccountIdsSortedFiat', () => {
      const store = createStore()
      const { ethAccount, ethAccount2, ethAccountId, ethAccount2Id } = mockETHandBTCAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxCaip19 }),
              mockEthToken({ balance: '1000000', assetId: usdcCaip19 }),
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
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
      const { ethAccount, ethAccount2, ethAccountId } = mockETHandBTCAccounts({
        ethAccountObj: {
          balance: '1000000000000000000',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '1000000000000000000', assetId: foxCaip19 }),
              mockEthToken({ balance: '1000000', assetId: usdcCaip19 }),
              mockEthToken({ balance: '1000000000000000000', assetId: zeroCaip19 }),
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
          [zeroCaip19]: zeroMarketData,
        }),
      )

      // dispatch asset data
      const assetData = mockAssetState()
      store.dispatch(assetsSlice.actions.setAssets(assetData))
      const state = store.getState()

      it('should return assetIds (excluding fee assets, ie Ethereum) of a given account, sorted by fiat value', () => {
        const expected = [zeroCaip19, foxCaip19, usdcCaip19]
        const result = selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, {
          accountId: ethAccountId,
        })

        expect(result).toEqual(expected)
      })
    })

    describe('selectPortfolioAccountRows', () => {
      const store = createStore()
      const { ethAccount } = mockETHandBTCAccounts({
        ethAccountObj: {
          balance: '0',
          chainSpecific: {
            tokens: [
              mockEthToken({ balance: '123456123456315537', assetId: foxCaip19 }),
              mockEthToken({ balance: '0', assetId: usdcCaip19 }),
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
        marketDataSlice.actions.setMarketData({
          [ethCaip19]: ethMarketData,
          [foxCaip19]: foxMarketData,
          [usdcCaip19]: usdcMarketData,
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

    describe('selectTotalFiatBalanceWithDelegations', () => {
      const cosmosAccountSpecifier: string =
        'cosmos:cosmoshub-4:cosmos1wc4rv7dv8lafv38s50pfp5qsgv7eknetyml669'

      it('should return correct fiat balance in case there are delegations, undelegations and asset balance', () => {
        const store = createStore()
        const assetData = mockAssetState({
          byId: {
            [cosmos.assetId]: cosmos,
          },
          ids: [cosmos.assetId],
        })
        store.dispatch(assetsSlice.actions.setAssets(assetData))

        const cosmosMarketData = mockMarketData({ price: '77.55' })
        store.dispatch(
          marketDataSlice.actions.setMarketData({
            [cosmos.assetId]: cosmosMarketData,
          }),
        )

        const cosmosAccount = merge(mockCosmosAccount(mockCosmosAccountWithStakingData), {
          balance: '1000',
        })

        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([cosmosAccount], [cosmosCaip19]),
          ),
        )

        const result = selectTotalFiatBalanceWithDelegations(store.getState(), {
          assetId: cosmosCaip19,
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(result).toEqual('1.25002845')
      })

      it('should return correct fiat balance in case there are delegations and undelegations but no asset balance', () => {
        const store = createStore()
        const assetData = mockAssetState({
          byId: {
            [cosmos.assetId]: cosmos,
          },
          ids: [cosmos.assetId],
        })
        store.dispatch(assetsSlice.actions.setAssets(assetData))

        const cosmosMarketData = mockMarketData({ price: '77.55' })
        store.dispatch(
          marketDataSlice.actions.setMarketData({
            [cosmos.assetId]: cosmosMarketData,
          }),
        )

        const cosmosAccount = mockCosmosAccount(mockCosmosAccountWithStakingData)
        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([cosmosAccount], [cosmosCaip19]),
          ),
        )

        const result = selectTotalFiatBalanceWithDelegations(store.getState(), {
          assetId: cosmosCaip19,
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(result).toEqual('1.17247845')
      })

      it('should return non zero fiat balance in case there are only undelegations but no asset balance', () => {
        const store = createStore()
        const assetData = mockAssetState({
          byId: {
            [cosmos.assetId]: cosmos,
          },
          ids: [cosmos.assetId],
        })
        store.dispatch(assetsSlice.actions.setAssets(assetData))

        const cosmosMarketData = mockMarketData({ price: '77.55' })
        store.dispatch(
          marketDataSlice.actions.setMarketData({
            [cosmos.assetId]: cosmosMarketData,
          }),
        )

        const cosmosAccount = mockCosmosAccount(mockCosmosAccountWithOnlyUndelegations)

        store.dispatch(
          portfolioSlice.actions.upsertPortfolio(
            mockUpsertPortfolio([cosmosAccount], [cosmosCaip19]),
          ),
        )

        const result = selectTotalFiatBalanceWithDelegations(store.getState(), {
          assetId: cosmosCaip19,
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(result).toEqual('0.0271425')
      })

      it('should return zero fiat balance in case there are no delegations nor asset balance', () => {
        const store = createStore()
        const assetData = mockAssetState({
          byId: {
            [cosmos.assetId]: cosmos,
          },
          ids: [cosmos.assetId],
        })
        store.dispatch(assetsSlice.actions.setAssets(assetData))

        const cosmosMarketData = mockMarketData({ price: '77.55' })
        store.dispatch(
          marketDataSlice.actions.setMarketData({
            [cosmos.assetId]: cosmosMarketData,
          }),
        )

        const result = selectTotalFiatBalanceWithDelegations(store.getState(), {
          assetId: cosmosCaip19,
          accountSpecifier: cosmosAccountSpecifier,
        })
        expect(result).toEqual('0')
      })
    })
  })
})
