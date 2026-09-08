import { describe, expect, it, vi } from 'vitest'

import { ChainAdapter } from './StarknetChainAdapter'

const ADDRESS = '0x2a4490f9596f08ed56a6cf130a1234fe3ef462701e89f8b036786ff8e0ebb42'
const NONCE = '0xc7'

const makeAdapter = () => new ChainAdapter({ rpcUrl: 'http://localhost', getKnownTokens: () => [] })

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) })

const invalidBlockId = { error: { code: -32602, message: 'Invalid params' } }

// Stub provider.fetch per block tag - 'latest' is the deployment probe getNonce runs first
const stubFetch = (adapter: ChainAdapter, byBlockTag: Record<string, () => unknown>) => {
  const provider = (adapter as unknown as { provider: { fetch: unknown } }).provider
  const fetch = vi.fn((_method: string, params: string[]) => {
    const handler = byBlockTag[params[0]]
    if (!handler) throw new Error(`unexpected block tag: ${params[0]}`)
    return Promise.resolve(handler())
  })
  provider.fetch = fetch
  return fetch
}

describe('StarknetChainAdapter', () => {
  describe('getNonce', () => {
    it('reads the nonce from the pre_confirmed block tag', async () => {
      const adapter = makeAdapter()
      const fetch = stubFetch(adapter, {
        latest: () => jsonResponse({ result: NONCE }),
        pre_confirmed: () => jsonResponse({ result: NONCE }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe(NONCE)
      // pending is never reached when the current spec name works
      expect(fetch.mock.calls.map(([, params]) => params[0])).toEqual(['latest', 'pre_confirmed'])
    })

    it('falls back to pending when the node rejects pre_confirmed', async () => {
      const adapter = makeAdapter()
      stubFetch(adapter, {
        latest: () => jsonResponse({ result: '0x0' }),
        // pre-0.9 nodes only know the old name
        pre_confirmed: () => jsonResponse(invalidBlockId),
        pending: () => jsonResponse({ result: NONCE }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe(NONCE)
    })

    it('still falls back to pending when the pre_confirmed request throws', async () => {
      const adapter = makeAdapter()
      stubFetch(adapter, {
        latest: () => jsonResponse({ result: '0x0' }),
        pre_confirmed: () => {
          throw new Error('non-2xx')
        },
        pending: () => jsonResponse({ result: NONCE }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe(NONCE)
    })

    it('throws rather than reporting a nonce when both block tags fail', async () => {
      const adapter = makeAdapter()
      stubFetch(adapter, {
        latest: () => jsonResponse({ result: '0x0' }),
        pre_confirmed: () => jsonResponse(invalidBlockId),
        pending: () => jsonResponse(invalidBlockId),
      })

      await expect(adapter.getNonce(ADDRESS)).rejects.toThrow('Failed to fetch nonce')
    })

    it('returns 0x0 without querying a nonce when the account is not deployed', async () => {
      const adapter = makeAdapter()
      const fetch = stubFetch(adapter, {
        latest: () => jsonResponse({ error: { code: 20, message: 'Contract not found' } }),
      })

      await expect(adapter.getNonce(ADDRESS)).resolves.toBe('0x0')
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })
})
