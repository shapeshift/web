import { renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'

import { useFoxyApr } from './useFoxyApr'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('useFoxyApr', () => {
  const MOCK_APR_RESPONSE = '0.42'
  const renderUseFoxyApr = () => renderHook(() => useFoxyApr())

  it('fetches FOXY APR', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        chains: [
          {
            chainId: '1',
            pools: [
              {
                name: 'FOX',
                address: '0x808d3e6b23516967ceae4f17a5f9038383ed5311',
                liquidityProviderApr: MOCK_APR_RESPONSE,
              },
            ],
          },
        ],
      },
    })

    const { result, rerender } = renderUseFoxyApr()
    expect(result.current.foxyApr).toBeNull()
    expect(result.current.loaded).toBe(false)
    rerender()
    await waitFor(() => {
      expect(result.current.foxyApr).toBe(MOCK_APR_RESPONSE)
    })
    expect(result.current.loaded).toBe(true)
  })
})
