import { findPriceHistoryByCaip19 } from '@shapeshiftoss/market-service'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { act, renderHook } from '@testing-library/react-hooks'
import { ethereum } from 'jest/mocks/assets'

import { usePriceHistory } from './usePriceHistory'

jest.mock('@shapeshiftoss/market-service')

const asset = {
  ...ethereum,
  description: ''
}

describe.skip('usePriceHistory', () => {
  it('successfully loads data', async () => {
    const historyData = [
      {
        price: 10,
        date: 'date'
      }
    ]

    ;(findPriceHistoryByCaip19 as jest.Mock<unknown>).mockImplementation(() =>
      Promise.resolve(historyData)
    )
    const { waitForValueToChange, result } = renderHook(
      ({ asset, timeframe }) => usePriceHistory({ assets: [], timeframe }),
      {
        initialProps: {
          asset,
          timeframe: HistoryTimeframe.DAY
        }
      }
    )

    await waitForValueToChange(() => result.current.data?.[0])

    expect(result.current.data).toEqual(historyData)
    expect(result.current.loading).toBe(false)
  })

  it('unsuccessfully loads data', async () => {
    await act(async () => {
      ;(findPriceHistoryByCaip19 as jest.Mock<unknown>).mockImplementation(() =>
        Promise.reject(null)
      )
      const { waitFor, result } = renderHook(
        ({ asset, timeframe }) => usePriceHistory({ assets: [], timeframe }),
        {
          initialProps: {
            asset,
            timeframe: HistoryTimeframe.DAY
          }
        }
      )

      await waitFor(() => expect(result.current.loading).toBe(true))

      expect(result.current.data).toEqual([])
      expect(result.current.loading).toBe(true)
    })
  })
})
