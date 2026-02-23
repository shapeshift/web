import type { Request, Response } from 'express'
import { z } from 'zod'

import { quoteStore } from '../lib/quoteStore'
import type { ErrorResponse } from '../types'

export const StatusRequestSchema = z.object({
  quoteId: z.string().uuid(),
  txHash: z.string().min(1).optional(),
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

    res.json({
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
    })
  } catch (error) {
    console.error('Error in getSwapStatus:', error)
    res.status(500).json({ error: 'Internal server error' } as ErrorResponse)
  }
}
