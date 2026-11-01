import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CurrentEpochMetadata } from '../types'
import {
  getCurrentEpochMetadataQueryKey,
  useCurrentEpochMetadataQuery,
} from './useCurrentEpochMetadataQuery'

vi.mock('../constants', () => ({
  IPFS_GATEWAY: 'https://ipfs.example',
  CURRENT_EPOCH_IPFS_HASH: 'metadata',
}))

const metadata: CurrentEpochMetadata = {
  epoch: 27,
  epochStartTimestamp: Date.UTC(2026, 9, 1),
  epochEndTimestamp: Date.UTC(2026, 10, 1) - 1,
  treasuryAddress: '',
  burnRate: 0.05,
  distributionRateByStakingContract: {},
  ipfsHashByEpoch: { 26: 'history' },
}

afterEach(() => vi.useRealTimers())

describe('epoch rollover', () => {
  it('stops exposing expired rates on an open page while preserving the history manifest', () => {
    vi.useFakeTimers()
    vi.setSystemTime(metadata.epochEndTimestamp - 10_000)
    const client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    })
    client.setQueryData(getCurrentEpochMetadataQueryKey(), metadata)
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const { result, unmount } = renderHook(() => useCurrentEpochMetadataQuery(), { wrapper })
    expect(result.current.data).toEqual(metadata)
    act(() => vi.advanceTimersByTime(30_000))
    expect(result.current.isOutdated).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(client.getQueryData(getCurrentEpochMetadataQueryKey())).toEqual(metadata)
    unmount()
    client.clear()
  })
})
