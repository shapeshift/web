import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LiquidityWithdrawalStatus } from './explorerApi'
import { queryLiquidityWithdrawalStatus } from './explorerApi'

vi.mock('axios')

const mockAxiosPost = vi.mocked(axios.post)

const makeResponse = (nodes: unknown[]) => ({
  data: {
    data: {
      allLiquidityWithdrawals: { nodes },
    },
  },
})

describe('queryLiquidityWithdrawalStatus', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return broadcastComplete with transactionRef when broadcast is successful', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeResponse([
        {
          broadcastByBroadcastId: {
            broadcastSuccessEventId: '123456',
            transactionRefsByBroadcastId: {
              nodes: [{ ref: '0xabc123' }],
            },
          },
        },
      ]),
    )

    const result = await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDC',
      'Ethereum',
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: true,
      transactionRef: '0xabc123',
    })

    expect(mockAxiosPost).toHaveBeenCalledWith(
      'https://explorer-service-processor.chainflip.io/graphql',
      expect.objectContaining({
        variables: {
          address: '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
          asset: 'Usdc',
          chain: 'Ethereum',
        },
      }),
    )
  })

  it('should return broadcastComplete false when broadcast has no success event', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeResponse([
        {
          broadcastByBroadcastId: {
            broadcastSuccessEventId: null,
            transactionRefsByBroadcastId: {
              nodes: [],
            },
          },
        },
      ]),
    )

    const result = await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDC',
      'Ethereum',
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })

  it('should return broadcastComplete false when no broadcast exists yet', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeResponse([
        {
          broadcastByBroadcastId: null,
        },
      ]),
    )

    const result = await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'ETH',
      'Ethereum',
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })

  it('should return null when no withdrawal nodes are found', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeResponse([]))

    const result = await queryLiquidityWithdrawalStatus(
      '0x0000000000000000000000000000000000000000',
      'USDC',
      'Ethereum',
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })

  it('should return null on network error', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('Network error'))

    const result = await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDC',
      'Ethereum',
    )

    expect(result).toBeNull()
  })

  it('should normalize address to lowercase', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeResponse([]))

    await queryLiquidityWithdrawalStatus(
      '0x5DAF465A9CCF64DEB146EEAE9E7BD40D6761C986',
      'USDC',
      'Ethereum',
    )

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        variables: expect.objectContaining({
          address: '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
        }),
      }),
    )
  })

  it('should convert asset symbol to GraphQL enum format', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeResponse([]))

    await queryLiquidityWithdrawalStatus('bc1qtest', 'BTC', 'Bitcoin')

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        variables: expect.objectContaining({
          asset: 'Btc',
          chain: 'Bitcoin',
        }),
      }),
    )
  })

  it('should return broadcastComplete false when success event exists but no tx ref', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeResponse([
        {
          broadcastByBroadcastId: {
            broadcastSuccessEventId: '789',
            transactionRefsByBroadcastId: {
              nodes: [],
            },
          },
        },
      ]),
    )

    const result = await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDT',
      'Ethereum',
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })
})
