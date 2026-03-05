import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

import {
  fetchChainflipSwapIdByTxHash,
  selectLatestChainflipSwapId,
} from './useChainflipSwapIdQuery'

vi.mock('axios', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
    },
  }
})

describe('useChainflipSwapIdQuery', () => {
  it('selectLatestChainflipSwapId returns the latest nativeId when multiple refs exist', () => {
    const result = selectLatestChainflipSwapId({
      data: {
        txRefs: {
          nodes: [{ swap: { nativeId: '123' } }, { swap: { nativeId: '456' } }],
        },
      },
    })

    expect(result).toBe('456')
  })

  it('fetchChainflipSwapIdByTxHash resolves latest nativeId from explorer response', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        data: {
          txRefs: {
            nodes: [{ swap: { nativeId: '111' } }, { swap: { nativeId: '222' } }],
          },
        },
      },
    })

    const result = await fetchChainflipSwapIdByTxHash('0xabc')

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(result).toBe('222')
  })
})
