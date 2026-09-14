import type { Response } from 'express'

import { getAsset } from '../../assets'
import { env } from '../../env'
import { callSwapService, fetchSwapService } from '../../lib/fetchSwapService'
import type { StoredQuote } from '../../lib/quoteStore'
import type { ErrorResponse } from '../../types'
import { STATUS_TIMEOUT_MS } from './constants'
import type { SwapServiceStatus, SwapStatusResponse } from './types'
import { SwapServiceStatusSchema } from './types'

type StatusError = { status: number; body: ErrorResponse }

export const statusErrors = {
  TX_HASH_REQUIRED: {
    status: 400,
    body: { error: 'txHash is required to begin tracking', code: 'TX_HASH_REQUIRED' },
  },
  TX_HASH_MISMATCH: {
    status: 409,
    body: {
      error: 'Transaction hash does not match the registered swap',
      code: 'TX_HASH_MISMATCH',
    },
  },
  QUOTE_NOT_FOUND: {
    status: 404,
    body: { error: 'Quote not found or expired', code: 'QUOTE_NOT_FOUND' },
  },
  REGISTRATION_FAILED: {
    status: 503,
    body: {
      error: 'Swap could not be registered with the swap service - try again',
      code: 'SERVICE_UNAVAILABLE',
    },
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    body: { error: 'Swap service unavailable', code: 'SERVICE_UNAVAILABLE' },
  },
  INVALID_RESPONSE: {
    status: 503,
    body: { error: 'Invalid response from swap service', code: 'INVALID_RESPONSE' },
  },
} as const satisfies Record<string, StatusError>

export const sendError = (res: Response, { status, body }: StatusError): void => {
  res.status(status).json(body)
}

export const validateTxHash = (
  storedQuote: StoredQuote,
  txHash: string | undefined,
): StatusError | undefined => {
  if (!txHash && !storedQuote.txHash && !storedQuote.depositAddress) {
    return statusErrors.TX_HASH_REQUIRED
  }

  if (txHash && storedQuote.txHash && storedQuote.txHash !== txHash) {
    return statusErrors.TX_HASH_MISMATCH
  }
}

const buildSwapRegistrationBody = (storedQuote: StoredQuote): string | undefined => {
  const sellAsset = getAsset(storedQuote.sellAssetId)
  const buyAsset = getAsset(storedQuote.buyAssetId)

  if (!sellAsset || !buyAsset) return

  return JSON.stringify({
    swapId: storedQuote.quoteId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: storedQuote.sellAmountCryptoBaseUnit,
    expectedBuyAmountCryptoBaseUnit: storedQuote.buyAmountAfterFeesCryptoBaseUnit,
    sellTxHash: storedQuote.txHash,
    source: storedQuote.swapperName,
    swapperName: storedQuote.swapperName,
    sellAccountId: storedQuote.sendAddress,
    buyAccountId: storedQuote.receiveAddress,
    receiveAddress: storedQuote.receiveAddress,
    partnerAddress: storedQuote.partnerAddress,
    partnerCode: storedQuote.partnerCode,
    partnerBps: storedQuote.partnerBps ? Number(storedQuote.partnerBps) : undefined,
    affiliateBps: Number(storedQuote.affiliateBps),
    shapeshiftBps: Number(storedQuote.shapeshiftBps),
    origin: 'api',
    quotedAt: new Date(storedQuote.createdAt).toISOString(),
    metadata: storedQuote.metadata,
  })
}

// Resolves to the created row, or nothing when the caller should read the row instead
export const registerQuote = async (
  registration: StoredQuote,
): Promise<SwapServiceStatus | undefined> => {
  const body = buildSwapRegistrationBody(registration)
  if (!body) return

  try {
    const postResponse = await callSwapService(
      `${env.SWAP_SERVICE_BASE_URL}/swaps`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
      STATUS_TIMEOUT_MS,
    )

    if (!postResponse.ok) {
      console.error(`swap-service POST failed (${postResponse.status}):`, await postResponse.text())
      return
    }

    const swapResult = SwapServiceStatusSchema.safeParse(
      await postResponse.json().catch(() => null),
    )

    if (!swapResult.success) {
      console.error(
        'Unexpected response shape from swap-service POST /swaps:',
        swapResult.error.errors,
      )
      return
    }

    return swapResult.data
  } catch (err) {
    console.error('Failed to register swap in swap-service:', err)
  }
}

export const getSwap = async (
  res: Response,
  quoteId: string,
  { wasJustRegistered }: { wasJustRegistered: boolean },
): Promise<SwapServiceStatus | undefined> => {
  const swapResponse = await fetchSwapService(
    res,
    `${env.SWAP_SERVICE_BASE_URL}/swaps/${quoteId}`,
    undefined,
    STATUS_TIMEOUT_MS,
  )

  if (!swapResponse) return

  if (swapResponse.status === 404) {
    sendError(
      res,
      wasJustRegistered ? statusErrors.REGISTRATION_FAILED : statusErrors.QUOTE_NOT_FOUND,
    )
    return
  }

  if (!swapResponse.ok) {
    console.error(`swap-service GET /swaps/${quoteId} failed (${swapResponse.status})`)
    sendError(res, statusErrors.SERVICE_UNAVAILABLE)
    return
  }

  const swapResult = SwapServiceStatusSchema.safeParse(await swapResponse.json().catch(() => null))

  if (!swapResult.success) {
    console.error(
      'Unexpected response shape from swap-service /swaps/:quoteId:',
      swapResult.error.errors,
    )
    sendError(res, statusErrors.INVALID_RESPONSE)
    return
  }

  return swapResult.data
}

const toClientStatus = (swap: SwapServiceStatus): SwapStatusResponse['status'] => {
  if (swap.status === 'SUCCESS') return 'confirmed'
  if (swap.status === 'FAILED') return 'failed'
  return swap.sellTxHash ? 'submitted' : 'pending'
}

export const toResponse = (quoteId: string, swap: SwapServiceStatus): SwapStatusResponse => ({
  quoteId,
  txHash: swap.sellTxHash ?? undefined,
  status: toClientStatus(swap),
  swapperName: swap.swapperName,
  sellAssetId: swap.sellAsset.assetId,
  buyAssetId: swap.buyAsset.assetId,
  sellAmountCryptoBaseUnit: swap.sellAmountCryptoBaseUnit,
  buyAmountAfterFeesCryptoBaseUnit: swap.expectedBuyAmountCryptoBaseUnit,
  partnerAddress: swap.partnerAddress ?? undefined,
  partnerBps: swap.partnerBps ? String(swap.partnerBps) : undefined,
  shapeshiftBps: String(swap.shapeshiftBps),
  affiliateBps: String(swap.affiliateBps),
  registeredAt: swap.createdAt,
  buyTxHash: swap.buyTxHash ?? undefined,
  isAffiliateVerified: swap.isAffiliateVerified ?? undefined,
})
