import type { Request, Response } from 'express'
import { z } from 'zod'

import { getAsset } from '../assets'
import { SWAP_SERVICE_BASE_URL } from '../config'
import { quoteStore } from '../lib/quoteStore'
import type { ErrorResponse } from '../types'

export const StatusRequestSchema = z.object({
  quoteId: z.string().uuid(),
  txHash: z.string().min(1).optional(),
})

const toHumanAmount = (baseUnit: string, precision: number): string => {
  if (precision === 0) return baseUnit
  const padded = baseUnit.padStart(precision + 1, '0')
  return `${padded.slice(0, -precision)}.${padded.slice(-precision)}`
}

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
      storedQuote.txHash = txHash
      storedQuote.registeredAt = Date.now()
      storedQuote.status = 'submitted'
      quoteStore.set(quoteId, storedQuote)

      // Create swap record in swap-service only when txHash is provided
      // This prevents phantom swap inflation from quote-only requests
      const sellAsset = getAsset(storedQuote.sellAssetId)
      const buyAsset = getAsset(storedQuote.buyAssetId)

      if (sellAsset && buyAsset) {
        try {
          await fetch(`${SWAP_SERVICE_BASE_URL}/swaps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              swapId: quoteId,
              sellAsset,
              buyAsset,
              sellAmountCryptoBaseUnit: storedQuote.sellAmountCryptoBaseUnit,
              expectedBuyAmountCryptoBaseUnit: storedQuote.buyAmountAfterFeesCryptoBaseUnit,
              sellAmountCryptoPrecision: toHumanAmount(
                storedQuote.sellAmountCryptoBaseUnit,
                sellAsset.precision,
              ),
              expectedBuyAmountCryptoPrecision: toHumanAmount(
                storedQuote.buyAmountAfterFeesCryptoBaseUnit,
                buyAsset.precision,
              ),
              sellTxHash: txHash,
              source: storedQuote.swapperName,
              swapperName: storedQuote.swapperName,
              sellAccountId: storedQuote.sendAddress,
              receiveAddress: storedQuote.receiveAddress,
              affiliateAddress: storedQuote.affiliateAddress,
              affiliateBps: storedQuote.affiliateBps,
              origin: 'api',
              metadata: storedQuote.metadata,
            }),
          })
        } catch (err) {
          console.error('Failed to register swap in swap-service:', err)
        }
      }
    }

    let swapServiceStatus: Record<string, unknown> | null = null
    if (storedQuote.txHash) {
      try {
        const swapResponse = await fetch(`${SWAP_SERVICE_BASE_URL}/swaps/${quoteId}`)
        if (swapResponse.ok) {
          swapServiceStatus = (await swapResponse.json()) as Record<string, unknown>
        }
      } catch (err) {
        console.error('Failed to fetch swap status from swap-service:', err)
      }
    }

    const status =
      swapServiceStatus?.status === 'SUCCESS'
        ? 'confirmed'
        : swapServiceStatus?.status === 'FAILED'
        ? 'failed'
        : storedQuote.status

    const response: Record<string, unknown> = {
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
