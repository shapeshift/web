import { HistoryData } from '@shapeshiftoss/types'
import { renderHook } from '@testing-library/react-hooks'

import { usePercentChange } from './usePercentChange'

describe('usePercentChange', () => {
  it('sets the percent', async () => {
    const historyData = [
      { price: 10, date: 'date' },
      { price: 12, data: 'date' }
    ] as HistoryData[]

    const { waitFor, result } = renderHook(
      ({ data, percentChange }) => usePercentChange({ data, percentChange }),
      {
        initialProps: {
          data: historyData,
          percentChange: 2
        }
      }
    )

    await waitFor(() => expect(result.current).toBe(20))
  })

  it('returns passed in percent', async () => {
    const { waitFor, result } = renderHook(
      ({ data, percentChange }) => usePercentChange({ data, percentChange }),
      {
        initialProps: {
          data: undefined,
          percentChange: 2
        }
      }
    )

    await waitFor(() => expect(result.current).toBe(2))
  })
})
