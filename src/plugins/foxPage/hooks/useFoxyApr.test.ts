import { renderHook } from '@testing-library/react-hooks'
import { act } from 'react-dom/test-utils'

import { useFoxyApr } from './useFoxyApr'

jest.mock('axios', () => ({
  get: jest.fn(() => ({
    data: {
      chains: [
        {
          chainId: '1',
          pools: [
            {
              name: 'FOX',
              address: '0x808d3e6b23516967ceae4f17a5f9038383ed5311',
              liquidityProviderApr: '0.42',
            },
          ],
        },
      ],
    },
  })),
}))

describe('useFoxyApr', () => {
  const renderUseFoxyApr = () => renderHook(() => useFoxyApr())

  it('fetches FOXY APR', async () => {
    const { result, waitForNextUpdate } = renderUseFoxyApr()
    expect(result.current.foxyApr).toBeNull()
    expect(result.current.loaded).toBe(false)
    await act(async () => waitForNextUpdate())
    expect(result.current.foxyApr).toBe('0.42')
    expect(result.current.loaded).toBe(true)
  })
})
