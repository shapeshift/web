import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, tronChainId } from '@shapeshiftoss/caip'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { parseAndUpsertSecondClassChainTx } from './secondClassChainTx'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { Tx } from '@/state/slices/txHistorySlice/txHistorySlice'
import { txHistory } from '@/state/slices/txHistorySlice/txHistorySlice'

vi.mock('@/context/PluginProvider/chainAdapterSingleton')

const firstClassChainId = ethChainId
const mockAccountId = `${tronChainId}:TJRabPrwbZy45sbavfcjinPJC18kjpRTv8` as AccountId
const mockTxHash = '0xdeadbeef'
const mockParsedTx = { txid: mockTxHash, status: 'confirmed' } as unknown as Tx

const mockDispatch = vi.fn()

describe('parseAndUpsertSecondClassChainTx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should no-op for first-class chains', async () => {
    await parseAndUpsertSecondClassChainTx({
      chainId: firstClassChainId,
      txHash: mockTxHash,
      accountId: mockAccountId,
      dispatch: mockDispatch,
    })

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should parse tx and dispatch onMessage + portfolio refresh for second-class chains', async () => {
    const mockAdapter = {
      parseTx: vi.fn().mockResolvedValue(mockParsedTx),
    }

    vi.mocked(getChainAdapterManager).mockReturnValue(
      new Map([[tronChainId, mockAdapter]]) as never,
    )

    await parseAndUpsertSecondClassChainTx({
      chainId: tronChainId,
      txHash: mockTxHash,
      accountId: mockAccountId,
      dispatch: mockDispatch,
    })

    expect(mockAdapter.parseTx).toHaveBeenCalledWith(
      mockTxHash,
      'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8',
    )
    expect(mockDispatch).toHaveBeenCalledWith(
      txHistory.actions.onMessage({
        message: mockParsedTx,
        accountId: mockAccountId,
      }),
    )
    expect(mockDispatch).toHaveBeenCalledTimes(2)
  })

  it('should handle multiple accountIdsToRefetch', async () => {
    const secondAccountId = `${tronChainId}:TZ4UXDV5ZhNW7fb2AMSbgfAEZ7hWsnYS2g` as AccountId
    const mockAdapter = {
      parseTx: vi.fn().mockResolvedValue(mockParsedTx),
    }

    vi.mocked(getChainAdapterManager).mockReturnValue(
      new Map([[tronChainId, mockAdapter]]) as never,
    )

    await parseAndUpsertSecondClassChainTx({
      chainId: tronChainId,
      txHash: mockTxHash,
      accountId: mockAccountId,
      accountIdsToRefetch: [mockAccountId, secondAccountId],
      dispatch: mockDispatch,
    })

    expect(mockAdapter.parseTx).toHaveBeenCalledTimes(2)
    expect(mockAdapter.parseTx).toHaveBeenCalledWith(
      mockTxHash,
      'TJRabPrwbZy45sbavfcjinPJC18kjpRTv8',
    )
    expect(mockAdapter.parseTx).toHaveBeenCalledWith(
      mockTxHash,
      'TZ4UXDV5ZhNW7fb2AMSbgfAEZ7hWsnYS2g',
    )
  })

  it('should no-op when adapter has no parseTx', async () => {
    const mockAdapter = {}

    vi.mocked(getChainAdapterManager).mockReturnValue(
      new Map([[tronChainId, mockAdapter]]) as never,
    )

    await parseAndUpsertSecondClassChainTx({
      chainId: tronChainId,
      txHash: mockTxHash,
      accountId: mockAccountId,
      dispatch: mockDispatch,
    })

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('should propagate errors from parseTx', async () => {
    const mockAdapter = {
      parseTx: vi.fn().mockRejectedValue(new Error('parse failed')),
    }

    vi.mocked(getChainAdapterManager).mockReturnValue(
      new Map([[tronChainId, mockAdapter]]) as never,
    )

    await expect(
      parseAndUpsertSecondClassChainTx({
        chainId: tronChainId,
        txHash: mockTxHash,
        accountId: mockAccountId,
        dispatch: mockDispatch,
      }),
    ).rejects.toThrow('parse failed')
  })
})
