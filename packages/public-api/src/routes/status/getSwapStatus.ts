import type { Request, Response } from 'express'

import { env } from '../../env'
import { fetchSwapService } from '../../lib/fetchSwapService'
import { quoteStore } from '../../lib/quoteStore'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema, rateLimitResponse } from '../../types'
import { STATUS_TIMEOUT_MS } from './constants'
import type { SwapStatusResponse } from './types'
import { StatusRequestSchema, SwapServiceStatusSchema, SwapStatusResponseSchema } from './types'
import { registerSwapInService } from './utils'

registry.registerPath({
  method: 'get',
  path: '/v1/swap/status',
  operationId: 'getSwapStatus',
  summary: 'Get swap status',
  description:
    'Look up the current status of a swap by its quote ID. Pass txHash on the first call after broadcasting to bind it to the quote and start tracking. Subsequent calls can omit txHash.',
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

    const storedQuote = quoteStore.get(quoteId)

    if (!storedQuote) {
      res.status(404).json({
        error: 'Quote not found or expired',
        code: 'QUOTE_NOT_FOUND',
      } satisfies ErrorResponse)
      return
    }

    if (!txHash && !storedQuote.txHash) {
      res.status(400).json({
        error: 'txHash is required to begin tracking',
        code: 'TX_HASH_REQUIRED',
      } satisfies ErrorResponse)
      return
    }

    if (txHash && storedQuote.txHash && storedQuote.txHash !== txHash) {
      res.status(409).json({
        error: 'Transaction hash does not match the registered swap',
        code: 'TX_HASH_MISMATCH',
      } satisfies ErrorResponse)
      return
    }

    const response: SwapStatusResponse = {
      quoteId,
      txHash: storedQuote.txHash,
      status: storedQuote.status,
      swapperName: storedQuote.swapperName,
      sellAssetId: storedQuote.sellAssetId,
      buyAssetId: storedQuote.buyAssetId,
      sellAmountCryptoBaseUnit: storedQuote.sellAmountCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: storedQuote.buyAmountAfterFeesCryptoBaseUnit,
      affiliateAddress: storedQuote.affiliateAddress,
      affiliateBps: storedQuote.affiliateBps,
      registeredAt: storedQuote.registeredAt,
    }

    if (txHash && !storedQuote.txHash) {
      const registeredQuote = {
        ...storedQuote,
        txHash,
        registeredAt: Date.now(),
        status: 'submitted' as const,
      }

      quoteStore.set(quoteId, registeredQuote)
      await registerSwapInService(registeredQuote)

      response.txHash = registeredQuote.txHash
      response.registeredAt = registeredQuote.registeredAt
      response.status = registeredQuote.status

      res.json(response)
      return
    }

    const swapResponse = await fetchSwapService(
      res,
      `${env.SWAP_SERVICE_BASE_URL}/swaps/${quoteId}`,
      undefined,
      STATUS_TIMEOUT_MS,
    )

    if (!swapResponse) return

    if (swapResponse.ok) {
      const statusResult = SwapServiceStatusSchema.safeParse(
        await swapResponse.json().catch(() => null),
      )

      if (!statusResult.success) {
        console.error(
          'Unexpected response shape from swap-service /swaps/:quoteId:',
          statusResult.error.errors,
        )
        res.status(503).json({
          error: 'Invalid response from swap service',
          code: 'INVALID_RESPONSE',
        } satisfies ErrorResponse)
        return
      }

      const swapServiceStatus = statusResult.data

      const status =
        swapServiceStatus.status === 'SUCCESS'
          ? 'confirmed'
          : swapServiceStatus.status === 'FAILED'
          ? 'failed'
          : storedQuote.status

      if (status !== storedQuote.status && (status === 'confirmed' || status === 'failed')) {
        response.status = status
        quoteStore.set(quoteId, { ...storedQuote, status })
      }

      if (swapServiceStatus.buyTxHash) response.buyTxHash = swapServiceStatus.buyTxHash
      if (swapServiceStatus.isAffiliateVerified !== undefined) {
        response.isAffiliateVerified = swapServiceStatus.isAffiliateVerified
      }

      res.json(response)
      return
    }

    if (swapResponse.status === 404) {
      await registerSwapInService(storedQuote)
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getSwapStatus:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}
