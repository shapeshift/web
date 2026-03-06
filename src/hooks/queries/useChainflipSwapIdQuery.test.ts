import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

// Mock axios before importing the module under test
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

// Mock the swapper module to prevent transitive import issues
vi.mock('@shapeshiftoss/swapper', () => ({
  SwapperName: {
    Chainflip: 'Chainflip',
  },
}))

// Mock @tanstack/react-query to prevent hook-related import issues
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  skipToken: Symbol('skipToken'),
}))

describe('fetchChainflipSwapId', () => {
  it('should return the nativeId from the GraphQL response', async () => {
    const { fetchChainflipSwapId } = await import('./useChainflipSwapIdQuery')

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: {
          txRefs: {
            nodes: [
              {
                swap: {
                  nativeId: '1333049',
                },
              },
            ],
          },
        },
      },
    })

    const result = await fetchChainflipSwapId('0xdeadbeef')

    expect(result).toBe('1333049')
    expect(axios.post).toHaveBeenCalledWith(
      'https://explorer-service-processor.chainflip.io/graphql',
      expect.objectContaining({
        variables: { searchString: '0xdeadbeef' },
      }),
    )
  })

  it('should return undefined when swap is not yet indexed', async () => {
    const { fetchChainflipSwapId } = await import('./useChainflipSwapIdQuery')

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: {
          txRefs: {
            nodes: [],
          },
        },
      },
    })

    const result = await fetchChainflipSwapId('0xdeadbeef')

    expect(result).toBeUndefined()
  })

  it('should return the real swap nativeId, not the broker channel ID', async () => {
    const { fetchChainflipSwapId } = await import('./useChainflipSwapIdQuery')

    // The broker API returns a channel ID (e.g., 45413) during deposit channel allocation.
    // The actual on-chain swap gets a completely different nativeId (e.g., 1333049).
    const realSwapNativeId = '1333049'

    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: {
          txRefs: {
            nodes: [
              {
                swap: {
                  nativeId: realSwapNativeId,
                },
              },
            ],
          },
        },
      },
    })

    const result = await fetchChainflipSwapId('0xsellTxHash')

    // The result should be the real swap nativeId, not the broker channel ID
    expect(result).toBe(realSwapNativeId)
    expect(result).not.toBe('45413') // Not the broker channel ID
  })
})
