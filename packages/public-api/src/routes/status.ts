import type { Request, Response } from 'express'
import { z } from 'zod'

import { getAsset } from '../assets'
import { SWAP_SERVICE_BASE_URL } from '../config'
import { quoteStore } from '../lib/quoteStore'
import type { ErrorResponse } from '../types'

const STATUS_TIMEOUT_MS = 10_000

export const StatusRequestSchema = z.object({
  quoteId: z.string().uuid(),
  txHash: z.string().min(1).max(128).optional(),
})

const toHumanAmount = (baseUnit: string, precision: number): string => {
  if (precision === 0) return baseUnit
  const padded = baseUnit.padStart(precision + 1, '0')
  return `${padded.slice(0, -precision)}.${padded.slice(-precision)}`
}

const buildSwapRegistrationBody = (storedQuote: ReturnType<typeof quoteStore.get> & object) => {
  const sellAsset = getAsset(storedQuote.sellAssetId)
  const buyAsset = getAsset(storedQuote.buyAssetId)
  if (!sellAsset || !buyAsset) return undefined

  return {
    body: JSON.stringify({
      swapId: storedQuote.quoteId,
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
      sellTxHash: storedQuote.txHash,
      source: storedQuote.swapperName,
      swapperName: storedQuote.swapperName,
      sellAccountId: storedQuote.sendAddress,
      receiveAddress: storedQuote.receiveAddress,
      affiliateAddress: storedQuote.affiliateAddress,
      affiliateBps: storedQuote.affiliateBps,
      origin: 'api',
      metadata: storedQuote.metadata,
    }),
    sellAsset,
    buyAsset,
  }
}

const registerSwapInService = async (storedQuote: ReturnType<typeof quoteStore.get> & object): Promise<boolean> => {
  const registration = buildSwapRegistrationBody(storedQuote)
  if (!registration) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS)
  try {
    const postResponse = await fetch(`${SWAP_SERVICE_BASE_URL}/swaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: registration.body,
    })
    if (!postResponse.ok) {
      const errorBody = await postResponse.text()
      console.error(`swap-service POST failed (${postResponse.status}):`, errorBody)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to register swap in swap-service:', err)
    return false
  } finally {
    clearTimeout(timeout)
  }
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

    const requestAffiliateAddress = req.affiliateInfo?.affiliateAddress?.toLowerCase()
    const quoteAffiliateAddress = storedQuote.affiliateAddress?.toLowerCase()
    if (quoteAffiliateAddress && requestAffiliateAddress !== quoteAffiliateAddress) {
      res.status(403).json({
        error: 'Quote is not accessible for this affiliate',
        code: 'AFFILIATE_MISMATCH',
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

    let swapServiceStatus: Record<string, unknown> | null = null
    if (storedQuote.txHash) {
      const getController = new AbortController()
      const getTimeout = setTimeout(() => getController.abort(), STATUS_TIMEOUT_MS)
      try {
        const swapResponse = await fetch(`${SWAP_SERVICE_BASE_URL}/swaps/${quoteId}`, {
          signal: getController.signal,
        })
        if (swapResponse.ok) {
          swapServiceStatus = (await swapResponse.json()) as Record<string, unknown>
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
