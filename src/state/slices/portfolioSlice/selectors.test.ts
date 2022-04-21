import { btcCaip2, btcCaip19, ethCaip2, ethCaip19 } from 'test/mocks/accounts'
import { mockStore } from 'test/mocks/store'
import { ReduxState } from 'state/reducer'

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
        accountSpecifiers: [{ [ethCaip2]: 'foo' }, { [btcCaip2]: 'bar' }],
      },
      portfolio: {
        ...mockStore.portfolio,
        assetBalances: {
          byId: {
            [ethCaip19]: '',
          },
          ids: [ethCaip19],
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
        accountSpecifiers: [{ [ethCaip2]: 'foo' }, { [btcCaip2]: 'bar' }],
      },
      portfolio: {
        ...mockStore.portfolio,
        assetBalances: {
          byId: {
            [ethCaip19]: '',
            [btcCaip19]: '',
          },
          ids: [ethCaip19, btcCaip19],
        },
      },
    }
    const result = selectIsPortfolioLoaded(thisMockStore)
    expect(result).toBeTruthy()
  })
})
