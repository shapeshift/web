import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CheckTradeStatusInput } from '../../types'
import { nearIntentsApi } from './endpoints'
import type { GetExecutionStatusResponse } from './types'
import { OneClickService } from './utils/oneClickService'

vi.mock('./utils/oneClickService', () => ({
  initializeOneClickService: vi.fn(),
  OneClickService: { getExecutionStatus: vi.fn() },
}))

const makeInput = (): CheckTradeStatusInput =>
  ({
    config: { VITE_NEAR_INTENTS_API_KEY: 'key' },
    swap: {
      metadata: { swapperMetadata: { name: 'nearIntents', depositAddress: '0xdepositaddress' } },
    },
  }) as unknown as CheckTradeStatusInput

type ExecutionStatus = {
  status: `${GetExecutionStatusResponse['status']}`
  swapDetails: Pick<
    GetExecutionStatusResponse['swapDetails'],
    'originChainTxHashes' | 'destinationChainTxHashes'
  >
}

const mockExecutionStatus = (response: ExecutionStatus) =>
  vi.mocked(OneClickService.getExecutionStatus).mockResolvedValue(response as never)

describe('near intents checkTradeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports the origin chain deposit tx hash', async () => {
    mockExecutionStatus({
      status: 'PROCESSING',
      swapDetails: {
        originChainTxHashes: [{ hash: '0xdeposit', explorerUrl: '' }],
        destinationChainTxHashes: [],
      },
    })

    const result = await nearIntentsApi.checkTradeStatus(makeInput())

    expect(result.sellTxHash).toBe('0xdeposit')
    expect(result.buyTxHash).toBeUndefined()
  })

  it('reports both sides once the swap settles', async () => {
    mockExecutionStatus({
      status: 'SUCCESS',
      swapDetails: {
        originChainTxHashes: [{ hash: '0xdeposit', explorerUrl: '' }],
        destinationChainTxHashes: [{ hash: '0xsettlement', explorerUrl: '' }],
      },
    })

    const result = await nearIntentsApi.checkTradeStatus(makeInput())

    expect(result.sellTxHash).toBe('0xdeposit')
    expect(result.buyTxHash).toBe('0xsettlement')
  })

  it('has no deposit tx hash before the deposit lands', async () => {
    mockExecutionStatus({
      status: 'PENDING_DEPOSIT',
      swapDetails: { originChainTxHashes: [], destinationChainTxHashes: [] },
    })

    expect((await nearIntentsApi.checkTradeStatus(makeInput())).sellTxHash).toBeUndefined()
  })
})
