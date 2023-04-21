import { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'

import type { OneInchSwapperDeps } from '../utils/types'
import { getApprovalAddress } from './getApprovalAddress'

jest.mock('axios')
const mockAxios = axios as jest.Mocked<typeof axios>

describe('getApprovalAddress', () => {
  const deps: OneInchSwapperDeps = {
    apiUrl: 'https://api.1inch.io/v5.0',
  }

  it('returns the correct address for the given chainId', async () => {
    mockAxios.get.mockImplementationOnce(
      async () =>
        await Promise.resolve({
          data: { address: '0x1111111254eeb25477b68fb85ed929f73a960583' },
        }),
    )
    expect(await getApprovalAddress(deps, KnownChainIds.EthereumMainnet)).toBe(
      '0x1111111254eeb25477b68fb85ed929f73a960583',
    )
  })

  it('returns undefined if chainId is not supported', async () => {
    mockAxios.get.mockImplementationOnce(
      async () =>
        await Promise.resolve({
          data: {
            statusCode: 404,
            message: 'Cannot GET /v5.0/500/approve/spender',
            error: 'Not Found',
          },
        }),
    )
    expect(await getApprovalAddress(deps, KnownChainIds.BnbSmartChainMainnet)).toBe(undefined)
  })
})
