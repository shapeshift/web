import type { MockedFunction } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorSubmitExtrinsic,
  cfAccountInfoV2,
  cfEncodeNonNativeCall,
  cfLendingPools,
} from './rpc'

const createJsonRpcResponse = (result: unknown) => ({
  jsonrpc: '2.0',
  result,
  id: 1,
})

const createJsonRpcErrorResponse = (message: string) => ({
  jsonrpc: '2.0',
  error: { code: -32000, message },
  id: 1,
})

const createResponse = (payload: unknown, status = 200): Response => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('chainflip rpc', () => {
  const fetchMock = vi.fn() as MockedFunction<typeof fetch>

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds JSON-RPC envelope for cf_lending_pools', async () => {
    const result = [{ asset: { chain: 'Ethereum', asset: 'USDC' } }]
    fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(result)))

    await expect(cfLendingPools()).resolves.toEqual(result)

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init?.body))

    expect(body).toMatchObject({
      jsonrpc: '2.0',
      method: 'cf_lending_pools',
      params: [],
    })
  })

  it('passes account param for cf_account_info_v2', async () => {
    const accountId = '0xabc'
    const result = { account_id: accountId }
    fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(result)))

    await expect(cfAccountInfoV2(accountId)).resolves.toEqual(result)

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init?.body))

    expect(body.method).toBe('cf_account_info_v2')
    expect(body.params).toEqual([accountId])
  })

  it('encodes cf_encode_non_native_call params', async () => {
    const result = [
      { Eip712: { domain: {}, types: {}, message: {}, primaryType: 'X' } },
      { nonce: 1, expiry_block: 2 },
    ]
    fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(result)))

    await expect(
      cfEncodeNonNativeCall({ hexCall: '0x01', blocksToExpiry: 120, nonceOrAccount: 0 }),
    ).resolves.toEqual(result)

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init?.body))

    expect(body.method).toBe('cf_encode_non_native_call')
    expect(body.params).toEqual(['0x01', 120, 0, { Eth: 'Eip712' }])
  })

  it('throws on rpc error responses', async () => {
    fetchMock.mockResolvedValue(createResponse(createJsonRpcErrorResponse('boom')))

    await expect(authorSubmitExtrinsic('0xdead')).rejects.toThrow('boom')
  })
})
