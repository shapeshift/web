import { renderHook } from '@testing-library/react-hooks'
import axios from 'axios'
import { act } from 'react-dom/test-utils'

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

    const { result, waitForNextUpdate } = renderUseFoxyApr()
    expect(result.current.data).toBeNull()
    expect(result.current.loaded).toBe(false)
    await act(async () => waitForNextUpdate())
    expect(result.current.data).toBe(MOCK_APR_RESPONSE)
    expect(result.current.loaded).toBe(true)
  })
})
