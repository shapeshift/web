import { FYND_CHAINS } from '@shapeshiftoss/swapper'
import type { Request, Response } from 'express'
import { z } from 'zod'

import { env } from '../env'

const FYND_URL = 'https://fynd-api.propellerheads.xyz/v1'
// Fynd License 1.0 §3.4 requires this notice wherever Fynd quotes are supplied to others.
export const FYND_LICENSE_NOTICE =
  'Fynd quotes are licensed under the Fynd License 1.0 ' +
  '(https://github.com/propeller-heads/fynd/blob/main/LICENSE.md). ' +
  'Trades must settle through the Fynd router listed in the Router Registry ' +
  '(https://docs.propellerheads.xyz/tycho/for-solvers/execution/contract-addresses), ' +
  "and the router's fees may not be bypassed."
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
const orderSchema = z
  .object({
    token_in: address,
    token_out: address,
    amount: z.string().regex(/^[1-9][0-9]{0,77}$/),
    side: z.literal('sell'),
    sender: address,
    receiver: address,
  })
  .strict()
const quoteSchema = z
  .object({
    orders: z.tuple([orderSchema]),
    options: z
      .object({
        timeout_ms: z.number().int().min(1).max(5_000),
        min_responses: z.literal(1),
        encoding_options: z
          .object({
            slippage: z.string().regex(/^0(?:\.\d+)?$/),
            transfer_type: z.literal('transfer_from'),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

export const getFyndQuote = async (req: Request, res: Response): Promise<void> => {
  if (!Object.values(FYND_CHAINS).some(chain => chain.name === req.params.chain)) {
    res.status(400).json({ error: 'Unsupported Fynd chain' })
    return
  }
  if (!env.FYND_API_KEY) {
    res.status(503).json({ error: 'Fynd is not configured' })
    return
  }

  const parsed = quoteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid Fynd quote request' })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(`${FYND_URL}/${req.params.chain}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: env.FYND_API_KEY },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
      redirect: 'error',
    })
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after')
      await response.body?.cancel()
      if (retryAfter) res.setHeader('Retry-After', retryAfter)
      res.status(response.status).json({ error: 'Fynd request failed' })
      return
    }
    const body: unknown = await response.json()
    const isObjectBody = typeof body === 'object' && body !== null && !Array.isArray(body)
    res.setHeader('Fynd-License-Notice', FYND_LICENSE_NOTICE)
    res.status(200).json(isObjectBody ? { ...body, license_notice: FYND_LICENSE_NOTICE } : body)
  } catch {
    res
      .status(controller.signal.aborted ? 504 : 502)
      .json({ error: controller.signal.aborted ? 'Fynd request timed out' : 'Fynd unavailable' })
  } finally {
    clearTimeout(timeout)
  }
}
