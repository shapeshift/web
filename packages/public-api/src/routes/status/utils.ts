import { getAsset } from '../../assets'
import { SWAP_SERVICE_BASE_URL } from '../../config'
import type { quoteStore } from '../../lib/quoteStore'
import { STATUS_TIMEOUT_MS } from './constants'

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

export const registerSwapInService = async (
  storedQuote: ReturnType<typeof quoteStore.get> & object,
): Promise<boolean> => {
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
