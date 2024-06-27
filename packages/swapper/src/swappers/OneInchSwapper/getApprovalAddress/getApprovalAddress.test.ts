import { KnownChainIds } from '@shapeshiftoss/types'
import { Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { describe, expect, it, vi } from 'vitest'

import { oneInchService } from '../utils/oneInchService'
import { getApprovalAddress } from './getApprovalAddress'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('../evm/utils/getThorTxData')
vi.mock('../utils/oneInchService', () => {
  const mockAxios = {
    default: {
      create: vi.fn(() => ({
        get: mocks.get,
        post: mocks.post,
      })),
    },
  }

  return {
    oneInchService: mockAxios.default.create(),
  }
})

describe('getApprovalAddress', () => {
  const apiUrl = 'https://api-shapeshift.1inch.io/v5.0'

  it('returns the correct address for the given chainId', async () => {
    vi.mocked(oneInchService.get).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: { address: '0x1111111254eeb25477b68fb85ed929f73a960583' },
        } as AxiosResponse),
      ),
    )
    const maybeApprovalAddress = await getApprovalAddress(apiUrl, KnownChainIds.EthereumMainnet)
    expect(maybeApprovalAddress.isOk()).toBe(true)
    expect(maybeApprovalAddress.unwrap()).toBe('0x1111111254eeb25477b68fb85ed929f73a960583')
  })

  it('returns undefined if chainId is not supported', async () => {
    vi.mocked(oneInchService.get).mockReturnValueOnce(
      Promise.resolve(
        Ok({
          data: {
            statusCode: 404,
            message: 'Cannot GET /v5.0/500/approve/spender',
            error: 'Not Found',
          },
        } as AxiosResponse),
      ),
    )
    const maybeApprovalAddress = await getApprovalAddress(
      apiUrl,
      KnownChainIds.BnbSmartChainMainnet,
    )
    expect(maybeApprovalAddress.isErr()).toBe(false)
    expect(maybeApprovalAddress.unwrap()).toBe(undefined)
  })
})
