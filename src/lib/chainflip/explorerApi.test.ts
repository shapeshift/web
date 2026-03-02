import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LiquidityWithdrawalStatus } from './explorerApi'
import { queryLatestWithdrawalId, queryLiquidityWithdrawalStatus } from './explorerApi'

vi.mock('axios')

const mockAxiosPost = vi.mocked(axios.post)

const makeStatusResponse = (nodes: unknown[]) => ({
  data: {
    data: {
      allLiquidityWithdrawals: { nodes },
    },
  },
})

const makeIdResponse = (nodes: { id: number }[]) => ({
  data: {
    data: {
      allLiquidityWithdrawals: { nodes },
    },
  },
})

describe('queryLatestWithdrawalId', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return the latest withdrawal id', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeIdResponse([{ id: 31922 }]))

    const result = await queryLatestWithdrawalId(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDC',
      'Ethereum',
    )

    expect(result).toBe(31922)
  })

  it('should return 0 when no withdrawals exist', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeIdResponse([]))

    const result = await queryLatestWithdrawalId(
      '0x0000000000000000000000000000000000000000',
      'USDC',
      'Ethereum',
    )

    expect(result).toBe(0)
  })

  it('should return 0 on network error', async () => {
    mockAxiosPost.mockRejectedValueOnce(new Error('Network error'))

    const result = await queryLatestWithdrawalId(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDC',
      'Ethereum',
    )

    expect(result).toBe(0)
  })

  it('should normalize address to lowercase', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeIdResponse([]))

    await queryLatestWithdrawalId('0x5DAF465A9CCF64DEB146EEAE9E7BD40D6761C986', 'USDC', 'Ethereum')

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        variables: expect.objectContaining({
          address: '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
        }),
      }),
    )
  })
})

describe('queryLiquidityWithdrawalStatus', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return broadcastComplete with transactionRef when broadcast is successful', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeStatusResponse([
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
      31900,
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
          afterId: 31900,
        },
      }),
    )
  })

  it('should return broadcastComplete false when broadcast has no success event', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeStatusResponse([
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
      0,
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })

  it('should return broadcastComplete false when no broadcast exists yet', async () => {
    mockAxiosPost.mockResolvedValueOnce(
      makeStatusResponse([
        {
          broadcastByBroadcastId: null,
        },
      ]),
    )

    const result = await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'ETH',
      'Ethereum',
      0,
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })

  it('should return broadcastComplete false when no withdrawal nodes are found', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeStatusResponse([]))

    const result = await queryLiquidityWithdrawalStatus(
      '0x0000000000000000000000000000000000000000',
      'USDC',
      'Ethereum',
      31922,
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
      0,
    )

    expect(result).toBeNull()
  })

  it('should normalize address to lowercase', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeStatusResponse([]))

    await queryLiquidityWithdrawalStatus(
      '0x5DAF465A9CCF64DEB146EEAE9E7BD40D6761C986',
      'USDC',
      'Ethereum',
      0,
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
    mockAxiosPost.mockResolvedValueOnce(makeStatusResponse([]))

    await queryLiquidityWithdrawalStatus('bc1qtest', 'BTC', 'Bitcoin', 0)

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
      makeStatusResponse([
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
      0,
    )

    expect(result).toEqual<LiquidityWithdrawalStatus>({
      broadcastComplete: false,
      transactionRef: null,
    })
  })

  it('should pass afterId to filter only newer withdrawals', async () => {
    mockAxiosPost.mockResolvedValueOnce(makeStatusResponse([]))

    await queryLiquidityWithdrawalStatus(
      '0x5daf465a9ccf64deb146eeae9e7bd40d6761c986',
      'USDC',
      'Ethereum',
      31922,
    )

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        variables: expect.objectContaining({
          afterId: 31922,
        }),
      }),
    )
  })
})
