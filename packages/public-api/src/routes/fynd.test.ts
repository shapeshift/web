import type { Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { env } from '../env'
import { FYND_LICENSE_NOTICE, getFyndQuote } from './fynd'

vi.mock('../env', () => ({ env: { FYND_API_KEY: 'test-server-key' } }))
vi.mock('@shapeshiftoss/swapper', () => ({
  FYND_CHAINS: {
    'eip155:1': { name: 'ethereum' },
  },
}))

const order = {
  token_in: '0x0000000000000000000000000000000000000000',
  token_out: '0x1111111111111111111111111111111111111111',
  amount: '1000000000000000000',
  side: 'sell',
  sender: '0x2222222222222222222222222222222222222222',
  receiver: '0x3333333333333333333333333333333333333333',
}
const body = {
  orders: [order],
  options: {
    timeout_ms: 5_000,
    min_responses: 1,
    encoding_options: { slippage: '0.005', transfer_type: 'transfer_from' },
  },
}

const request = (chain = 'ethereum', payload: unknown = body) =>
  ({ params: { chain }, body: payload }) as unknown as Request
const response = () => {
  const status = vi.fn().mockReturnThis()
  const json = vi.fn().mockReturnThis()
  const setHeader = vi.fn().mockReturnThis()
  return { status, json, setHeader } as unknown as Response
}

describe('Fynd proxy', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    env.FYND_API_KEY = 'test-server-key'
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('posts one validated order including native transfer_from encoding', async () => {
    fetchMock.mockResolvedValue(new globalThis.Response(JSON.stringify({ orders: [] })))
    const res = response()
    await getFyndQuote(request(), res)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://fynd-api.propellerheads.xyz/v1/ethereum/quote',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', Authorization: 'test-server-key' },
        redirect: 'error',
      }),
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ orders: [], license_notice: FYND_LICENSE_NOTICE })
  })

  it('attaches the Fynd License notice to every supplied quote', async () => {
    fetchMock.mockResolvedValue(new globalThis.Response(JSON.stringify({ orders: [] })))
    const res = response()
    await getFyndQuote(request(), res)
    expect(res.setHeader).toHaveBeenCalledWith('Fynd-License-Notice', FYND_LICENSE_NOTICE)
    expect(FYND_LICENSE_NOTICE).toContain(
      'https://github.com/propeller-heads/fynd/blob/main/LICENSE.md',
    )
    expect(FYND_LICENSE_NOTICE).toContain(
      'https://docs.propellerheads.xyz/tycho/for-solvers/execution/contract-addresses',
    )
  })

  it('does not call upstream without credentials', async () => {
    env.FYND_API_KEY = ''
    const res = response()
    await getFyndQuote(request(), res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects arbitrary upstream paths', async () => {
    const res = response()
    await getFyndQuote(request('../admin'), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { ...body, orders: [order, order] },
    { ...body, orders: [{ ...order, amount: '1e18' }] },
    { ...body, orders: [{ ...order, side: 'buy' }] },
    { ...body, options: { ...body.options, timeout_ms: 5001 } },
    { ...body, options: { ...body.options, client_fee: { bps: 100 } } },
    {
      ...body,
      options: {
        ...body.options,
        encoding_options: { slippage: '1', transfer_type: 'transfer_from' },
      },
    },
    {
      ...body,
      options: {
        ...body.options,
        encoding_options: { slippage: '0.005', transfer_type: 'native' },
      },
    },
  ])('rejects unsupported quote inputs', async payload => {
    const res = response()
    await getFyndQuote(request('ethereum', payload), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves rate limits without leaking upstream bodies or other headers', async () => {
    const upstream = new globalThis.Response('secret test-server-key', {
      status: 429,
      headers: { 'Retry-After': '30', Authorization: 'test-server-key' },
    })
    if (!upstream.body) throw new Error('Expected upstream response body')
    const cancel = vi.spyOn(upstream.body, 'cancel')
    fetchMock.mockResolvedValue(upstream)
    const res = response()
    await getFyndQuote(request(), res)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.setHeader).toHaveBeenCalledExactlyOnceWith('Retry-After', '30')
    expect(res.json).toHaveBeenCalledWith({ error: 'Fynd request failed' })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('does not expose connection error details', async () => {
    fetchMock.mockRejectedValue(new Error('Authorization: test-server-key'))
    const res = response()
    await getFyndQuote(request(), res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.json).toHaveBeenCalledWith({ error: 'Fynd unavailable' })
  })

  it('aborts slow upstream requests', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
        }),
    )
    const res = response()
    const pending = getFyndQuote(request(), res)
    await vi.advanceTimersByTimeAsync(10_000)
    await pending
    expect(res.status).toHaveBeenCalledWith(504)
  })
})
