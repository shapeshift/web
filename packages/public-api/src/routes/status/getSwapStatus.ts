import type { Request, Response } from 'express'

import { env } from '../../env'
import { requiresTxHashToTrack } from '../../lib/externalPayment'
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
      if (!txHash && requiresTxHashToTrack(storedQuote)) {
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

      const registration = { ...storedQuote, txHash: storedQuote.txHash ?? txHash }

      if (await registerSwapInService(registration)) {
        quoteStore.delete(quoteId)
      } else {
        // Keep the hash so the retry can omit it, as the docs promise for later polls
        quoteStore.set(quoteId, registration)
      }
    }

    const swapResponse = await fetchSwapService(
      res,
      `${env.SWAP_SERVICE_BASE_URL}/swaps/${quoteId}`,
      undefined,
      STATUS_TIMEOUT_MS,
    )

    if (!swapResponse) return

    if (swapResponse.status === 404) {
      if (storedQuote) {
        res.status(503).json({
          error: 'Swap could not be registered with the swap service; poll again',
          code: 'SERVICE_UNAVAILABLE',
        } satisfies ErrorResponse)
        return
      }

      res.status(404).json({
        error: 'Quote not found or expired',
        code: 'QUOTE_NOT_FOUND',
      } satisfies ErrorResponse)
      return
    }

    if (!swapResponse.ok) {
      console.error(`swap-service GET /swaps/${quoteId} failed (${swapResponse.status})`)
      res.status(503).json({
        error: 'Swap service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      } satisfies ErrorResponse)
      return
    }

    const swapResult = SwapServiceStatusSchema.safeParse(
      await swapResponse.json().catch(() => null),
    )

    if (!swapResult.success) {
      console.error(
        'Unexpected response shape from swap-service /swaps/:quoteId:',
        swapResult.error.errors,
      )
      res.status(503).json({
        error: 'Invalid response from swap service',
        code: 'INVALID_RESPONSE',
      } satisfies ErrorResponse)
      return
    }

    const swap = swapResult.data

    if (txHash && swap.sellTxHash && swap.sellTxHash !== txHash) {
      res.status(409).json({
        error: 'Transaction hash does not match the registered swap',
        code: 'TX_HASH_MISMATCH',
      } satisfies ErrorResponse)
      return
    }

    const status =
      swap.status === 'SUCCESS'
        ? 'confirmed'
        : swap.status === 'FAILED'
        ? 'failed'
        : swap.sellTxHash
        ? 'submitted'
        : 'pending'

    const response: SwapStatusResponse = {
      quoteId,
      txHash: swap.sellTxHash ?? undefined,
      status,
      swapperName: swap.swapperName,
      sellAssetId: swap.sellAsset.assetId,
      buyAssetId: swap.buyAsset.assetId,
      sellAmountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: swap.expectedBuyAmountCryptoBaseUnit,
      partnerAddress: swap.partnerAddress ?? undefined,
      partnerBps: String(swap.partnerBps),
      shapeshiftBps: String(swap.shapeshiftBps),
      affiliateBps: String(swap.affiliateBps),
      registeredAt: swap.createdAt,
      buyTxHash: swap.buyTxHash ?? undefined,
      isAffiliateVerified: swap.isAffiliateVerified ?? undefined,
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getSwapStatus:', error)
    res.status(500).json({ error: 'Internal server error' } satisfies ErrorResponse)
  }
}
