import { btcAssetId, btcChainId, ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { mockStore } from 'test/mocks/store'
import type { ReduxState } from 'state/reducer'

import { selectIsPortfolioLoaded } from './selectors'

jest.mock('../selectors', () => {
  return {
    ...jest.requireActual('./selectors'),
    selectAccountSpecifiers: jest.mock,
  }
})

describe('selectIsPortfolioLoaded', () => {
  it('should return false for empty account specifiers', () => {
    const thisMockStore: ReduxState = {
      ...mockStore,
      accountSpecifiers: {
        accountSpecifiers: [],
      },
      portfolio: {
        ...mockStore.portfolio,
        assetBalances: {
          byId: {},
          ids: [],
        },
      },
    }
    const result = selectIsPortfolioLoaded(thisMockStore)
    expect(result).toBeFalsy()
  })

  it('should return false if partially loaded', () => {
    const thisMockStore: ReduxState = {
      ...mockStore,
      accountSpecifiers: {
        accountSpecifiers: [{ [ethChainId]: 'foo' }, { [btcChainId]: 'bar' }],
      },
      portfolio: {
        ...mockStore.portfolio,
        assetBalances: {
          byId: {
            [ethAssetId]: '',
          },
          ids: [ethAssetId],
        },
      },
    }
    const result = selectIsPortfolioLoaded(thisMockStore)
    expect(result).toBeFalsy()
  })

  it('should return true if fully loaded', () => {
    const thisMockStore: ReduxState = {
      ...mockStore,
      accountSpecifiers: {
        accountSpecifiers: [{ [ethChainId]: 'foo' }, { [btcChainId]: 'bar' }],
      },
      portfolio: {
        ...mockStore.portfolio,
        assetBalances: {
          byId: {
            [ethAssetId]: '',
            [btcAssetId]: '',
          },
          ids: [ethAssetId, btcAssetId],
        },
      },
    }
    const result = selectIsPortfolioLoaded(thisMockStore)
    expect(result).toBeTruthy()
  })
})
