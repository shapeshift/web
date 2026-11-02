import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchEpochHistory } from './useEpochHistoryQuery'

import { queryClient } from '@/context/QueryClientProvider/queryClient'

vi.mock('axios')
vi.mock('../constants', () => ({ IPFS_GATEWAY: 'https://ipfs.example' }))
vi.mock('@/context/QueryClientProvider/queryClient', () => ({ queryClient: new QueryClient() }))
vi.mock('./useCurrentEpochMetadataQuery', () => ({
  getCurrentEpochMetadataQueryKey: () => ['metadata'],
  fetchCurrentEpochMetadata: () =>
    Promise.resolve({
      ipfsHashByEpoch: { 0: 'a', 1: 'b', 2: 'c', 3: 'd', 4: 'e' },
    }),
}))

describe('epoch history cache', () => {
  beforeEach(() => queryClient.clear())

  it('retries only missing files and never returns an incomplete total', async () => {
    vi.mocked(axios.get).mockImplementation(url => {
      if (url.endsWith('/e')) return Promise.reject(new Error('rate limited'))
      return Promise.resolve({ data: { number: url.charCodeAt(url.length - 1) } })
    })
    await expect(fetchEpochHistory()).rejects.toThrow('rate limited')
    expect(axios.get).toHaveBeenCalledTimes(5)

    vi.mocked(axios.get).mockResolvedValueOnce({ data: { number: 101 } })
    const history = await fetchEpochHistory()
    expect(axios.get).toHaveBeenCalledTimes(6)
    expect(history.map(item => item.ipfsHash)).toEqual(['e', 'd', 'c', 'b', 'a'])
    await fetchEpochHistory()
    expect(axios.get).toHaveBeenCalledTimes(6)
  })

  it('limits concurrent requests and bounds each request', async () => {
    const inFlight = new Set<string>()
    const sizes: number[] = []
    vi.mocked(axios.get).mockImplementation(async url => {
      inFlight.add(url)
      sizes.push(inFlight.size)
      await Promise.resolve()
      inFlight.delete(url)
      return { data: { number: 0 } }
    })
    await fetchEpochHistory()
    expect(Math.max(...sizes)).toBe(4)
    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ timeout: 15_000 }),
    )
  })
})
