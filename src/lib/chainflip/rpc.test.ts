import type { MockedFunction } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  authorSubmitExtrinsic,
  cfAccountInfo,
  cfEncodeNonNativeCall,
  cfFreeBalances,
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

  it('passes account param for cf_account_info', async () => {
    const accountId = '0xabc'
    const result = { role: 'unregistered', flip_balance: '0x0' }
    fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(result)))

    await expect(cfAccountInfo(accountId)).resolves.toEqual(result)

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init?.body))

    expect(body.method).toBe('cf_account_info')
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

  describe('cfFreeBalances', () => {
    it('normalizes nested raw response into flat array with decimal balance strings', async () => {
      const rawResponse = {
        Ethereum: { ETH: '0x0', FLIP: '0x0', USDC: '0x12fe4da', USDT: '0x0' },
        Bitcoin: { BTC: '0x0' },
        Solana: { SOL: '0x0', USDC: '0x0' },
      }

      fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(rawResponse)))

      const result = await cfFreeBalances('0xabc')

      expect(result).toEqual([
        { asset: { chain: 'Ethereum', asset: 'ETH' }, balance: '0' },
        { asset: { chain: 'Ethereum', asset: 'FLIP' }, balance: '0' },
        { asset: { chain: 'Ethereum', asset: 'USDC' }, balance: '19915994' },
        { asset: { chain: 'Ethereum', asset: 'USDT' }, balance: '0' },
        { asset: { chain: 'Bitcoin', asset: 'BTC' }, balance: '0' },
        { asset: { chain: 'Solana', asset: 'SOL' }, balance: '0' },
        { asset: { chain: 'Solana', asset: 'USDC' }, balance: '0' },
      ])
    })

    it('includes multi-chain assets across all chains', async () => {
      const rawResponse = {
        Ethereum: { USDC: '0x1' },
        Arbitrum: { USDC: '0x2' },
        Solana: { USDC: '0x3' },
      }

      fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(rawResponse)))

      const result = await cfFreeBalances('0xabc')

      expect(result).toEqual([
        { asset: { chain: 'Ethereum', asset: 'USDC' }, balance: '1' },
        { asset: { chain: 'Arbitrum', asset: 'USDC' }, balance: '2' },
        { asset: { chain: 'Solana', asset: 'USDC' }, balance: '3' },
      ])
    })

    it('converts hex balances to decimal strings', async () => {
      const rawResponse = {
        Ethereum: { ETH: '0xde0b6b3a7640000' },
      }

      fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(rawResponse)))

      const result = await cfFreeBalances('0xabc')

      expect(result).toEqual([
        { asset: { chain: 'Ethereum', asset: 'ETH' }, balance: '1000000000000000000' },
      ])
    })

    it('passes account id to cf_free_balances rpc method', async () => {
      const rawResponse = { Bitcoin: { BTC: '0x0' } }
      fetchMock.mockResolvedValue(createResponse(createJsonRpcResponse(rawResponse)))

      await cfFreeBalances('0xdeadbeef')

      const [, init] = fetchMock.mock.calls[0]
      const body = JSON.parse(String(init?.body))

      expect(body.method).toBe('cf_free_balances')
      expect(body.params).toEqual(['0xdeadbeef'])
    })
  })
})
