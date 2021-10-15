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
      ({ data, initPercentChange }) => usePercentChange({ data, initPercentChange }),
      {
        initialProps: {
          data: historyData,
          initPercentChange: 2
        }
      }
    )

    await waitFor(() => expect(result.current).toBe(20))
  })

  it('returns passed in percent', async () => {
    const { waitFor, result } = renderHook(
      ({ data, initPercentChange }) => usePercentChange({ data: null, initPercentChange }),
      {
        initialProps: {
          data: undefined,
          initPercentChange: 2
        }
      }
    )

    await waitFor(() => expect(result.current).toBe(2))
  })
})
