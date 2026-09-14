import type { Request, Response } from 'express'

import { quoteStore } from '../../lib/quoteStore'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema, rateLimitResponse } from '../../types'
import { StatusRequestSchema, SwapStatusResponseSchema } from './types'
import {
  getSwap,
  registerQuote,
  sendError,
  statusErrors,
  toResponse,
  validateTxHash,
} from './utils'

registry.registerPath({
  method: 'get',
  path: '/v1/swap/status',
  operationId: 'getSwapStatus',
  summary: 'Get swap status',
  description:
    'Look up the current status of a swap by its quote ID. Pass txHash on the first call after broadcasting to bind it to the quote and begin tracking; later calls can omit it. Externally paid quotes need no txHash - tracking starts from the quote ID alone and txHash is filled in once the provider reports the deposit - unless the application signed the deposit itself and passes its hash on the first call. A hash binds on the first call only.',
  tags: ['Swaps'],
  request: {
    headers: PartnerCodeHeaderSchema,
    query: StatusRequestSchema,
  },
  responses: {
    200: {
      description: 'Swap status',
      content: { 'application/json': { schema: SwapStatusResponseSchema } },
    },
    400: { description: 'Invalid request parameters or txHash required to begin tracking' },
    404: { description: 'Quote not found or expired' },
    409: { description: 'Transaction hash mismatch' },
    429: rateLimitResponse,
    500: { description: 'Internal server error' },
    503: { description: 'Swap service unavailable' },
    504: { description: 'Swap service timed out' },
  },
})

export const getSwapStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryResult = StatusRequestSchema.safeParse(req.query)
    if (!queryResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: queryResult.error.errors,
      } satisfies ErrorResponse)
      return
    }

    const { quoteId, txHash } = queryResult.data

    // Present only until the swap is registered - from then on swap-service is the record
    const storedQuote = quoteStore.get(quoteId)

    if (storedQuote) {
      const txHashError = validateTxHash(storedQuote, txHash)
      if (txHashError) {
        sendError(res, txHashError)
        return
      }

      await registerQuote(quoteId, storedQuote, txHash)
    }

    const swap = await getSwap(res, quoteId, { wasJustRegistered: Boolean(storedQuote) })
    if (!swap) return

    // The row settles it whatever registration reported - a first poll that lost the insert race must not leave a record behind
    if (storedQuote) quoteStore.delete(quoteId)

    if (txHash && swap.sellTxHash && swap.sellTxHash !== txHash) {
      sendError(res, statusErrors.TX_HASH_MISMATCH)
      return
    }

    res.json(toResponse(quoteId, swap))
  } catch (error) {
    console.error('Error in getSwapStatus:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}
