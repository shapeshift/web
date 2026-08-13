import { Ok } from '@sniptt/monads'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckTradeStatusInput } from '../../types'
import { chainflipApi } from './endpoints'
import { chainflipService } from './utils/chainflipService'

vi.mock('./utils/chainflipService', () => ({
  chainflipService: { get: vi.fn() },
}))

const makeInput = (): CheckTradeStatusInput =>
  ({
    config: { VITE_CHAINFLIP_API_URL: 'https://broker', VITE_CHAINFLIP_API_KEY: 'key' },
    swap: { metadata: { swapperMetadata: { name: 'chainflip', swapId: 1234 } } },
  }) as unknown as CheckTradeStatusInput

const mockStatus = (status: Record<string, unknown>) =>
  vi.mocked(chainflipService.get).mockResolvedValue(Ok({ data: { status } }) as never)

describe('chainflip checkTradeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports the deposit tx hash while the swap is still pending', async () => {
    mockStatus({ state: 'swapping', swapId: '1234', deposit: { transactionReference: '0xdeposit' } })

    const result = await chainflipApi.checkTradeStatus(makeInput())

    expect(result.sellTxHash).toBe('0xdeposit')
    expect(result.buyTxHash).toBeUndefined()
  })

  it('reports the deposit tx hash alongside a completed egress', async () => {
    mockStatus({
      state: 'completed',
      swapId: '1234',
      deposit: { transactionReference: '0xdeposit' },
      swapEgress: { transactionReference: '0xegress' },
    })

    const result = await chainflipApi.checkTradeStatus(makeInput())

    expect(result.sellTxHash).toBe('0xdeposit')
    expect(result.buyTxHash).toBe('0xegress')
  })

  it('has no deposit tx hash before the deposit is witnessed', async () => {
    mockStatus({ state: 'waiting', swapId: '1234' })

    expect((await chainflipApi.checkTradeStatus(makeInput())).sellTxHash).toBeUndefined()
  })

  it('treats a null transaction reference as no deposit yet', async () => {
    mockStatus({ state: 'receiving', swapId: '1234', deposit: { transactionReference: null } })

    expect((await chainflipApi.checkTradeStatus(makeInput())).sellTxHash).toBeUndefined()
  })
})
