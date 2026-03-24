import type { Request, Response } from 'express'

import { quoteStore } from '../../lib/quoteStore'
import { env } from '../../env'
import { registry } from '../../registry'
import type { ErrorResponse } from '../../types'
import { PartnerCodeHeaderSchema } from '../../types'
import { STATUS_TIMEOUT_MS } from './constants'
import type { SwapServiceStatus, SwapStatusResponse } from './types'
import { StatusRequestSchema, SwapStatusResponseSchema } from './types'
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
    400: {
      description: 'Invalid request parameters',
    },
    404: {
      description: 'Quote not found or expired',
    },
    409: {
      description: 'Transaction hash mismatch',
    },
  },
})

export const getSwapStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = StatusRequestSchema.safeParse(req.query)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request parameters',
        details: parseResult.error.errors,
      } as ErrorResponse)
      return
    }

    const { quoteId, txHash } = parseResult.data

    const storedQuote = quoteStore.get(quoteId)

    if (!storedQuote) {
      res.status(404).json({
        error: 'Quote not found or expired',
        code: 'QUOTE_NOT_FOUND',
      } as ErrorResponse)
      return
    }

    if (txHash && storedQuote.txHash && storedQuote.txHash !== txHash) {
      res.status(409).json({
        error: 'Transaction hash does not match the registered swap',
        code: 'TX_HASH_MISMATCH',
      } as ErrorResponse)
      return
    }

    if (txHash && !storedQuote.txHash) {
      // Defense-in-depth: re-read from store before mutation (future-proofing for potential async operations above)
      const current = quoteStore.get(quoteId)
      if (current?.txHash) {
        res.json({
          quoteId,
          txHash: current.txHash,
          status: current.status,
          swapperName: current.swapperName,
          sellAssetId: current.sellAssetId,
          buyAssetId: current.buyAssetId,
          sellAmountCryptoBaseUnit: current.sellAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: current.buyAmountAfterFeesCryptoBaseUnit,
          affiliateAddress: current.affiliateAddress,
          affiliateBps: current.affiliateBps,
          registeredAt: current.registeredAt,
        })
        return
      }

      storedQuote.txHash = txHash
      storedQuote.registeredAt = Date.now()
      storedQuote.status = 'submitted'
      quoteStore.set(quoteId, storedQuote)

      await registerSwapInService(storedQuote)
    }

    let swapServiceStatus: SwapServiceStatus | null = null
    if (storedQuote.txHash) {
      const getController = new AbortController()
      const getTimeout = setTimeout(() => getController.abort(), STATUS_TIMEOUT_MS)
      try {
        const swapResponse = await fetch(`${env.SWAP_SERVICE_BASE_URL}/swaps/${quoteId}`, {
          signal: getController.signal,
        })
        if (swapResponse.ok) {
          swapServiceStatus = (await swapResponse.json()) as SwapServiceStatus
        } else if (swapResponse.status === 404) {
          await registerSwapInService(storedQuote)
        }
      } catch (err) {
        console.error('Failed to fetch swap status from swap-service:', err)
      } finally {
        clearTimeout(getTimeout)
      }
    }

    const status =
      swapServiceStatus?.status === 'SUCCESS'
        ? 'confirmed'
        : swapServiceStatus?.status === 'FAILED'
        ? 'failed'
        : storedQuote.status

    if (status !== storedQuote.status && (status === 'confirmed' || status === 'failed')) {
      storedQuote.status = status
      quoteStore.set(quoteId, storedQuote)
    }

    const response: SwapStatusResponse = {
      quoteId,
      txHash: storedQuote.txHash,
      status,
      swapperName: storedQuote.swapperName,
      sellAssetId: storedQuote.sellAssetId,
      buyAssetId: storedQuote.buyAssetId,
      sellAmountCryptoBaseUnit: storedQuote.sellAmountCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: storedQuote.buyAmountAfterFeesCryptoBaseUnit,
      affiliateAddress: storedQuote.affiliateAddress,
      affiliateBps: storedQuote.affiliateBps,
      registeredAt: storedQuote.registeredAt,
    }

    if (swapServiceStatus?.buyTxHash) {
      response.buyTxHash = swapServiceStatus.buyTxHash
    }
    if (swapServiceStatus?.isAffiliateVerified !== undefined) {
      response.isAffiliateVerified = swapServiceStatus.isAffiliateVerified
    }

    res.json(response)
  } catch (error) {
    console.error('Error in getSwapStatus:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
