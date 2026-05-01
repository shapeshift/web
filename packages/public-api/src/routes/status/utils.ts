import { getAsset } from '../../assets'
import { env } from '../../env'
import type { quoteStore } from '../../lib/quoteStore'
import { STATUS_TIMEOUT_MS } from './constants'

const buildSwapRegistrationBody = (storedQuote: ReturnType<typeof quoteStore.get> & object) => {
  const sellAsset = getAsset(storedQuote.sellAssetId)
  const buyAsset = getAsset(storedQuote.buyAssetId)
  if (!sellAsset || !buyAsset) return undefined

  const parsedBps = Number.parseInt(storedQuote.affiliateBps, 10)

  return {
    body: JSON.stringify({
      swapId: storedQuote.quoteId,
      sellAsset,
      buyAsset,
      sellAmountCryptoBaseUnit: storedQuote.sellAmountCryptoBaseUnit,
      expectedBuyAmountCryptoBaseUnit: storedQuote.buyAmountAfterFeesCryptoBaseUnit,
      sellTxHash: storedQuote.txHash,
      source: storedQuote.swapperName,
      swapperName: storedQuote.swapperName,
      sellAccountId: storedQuote.sendAddress,
      receiveAddress: storedQuote.receiveAddress,
      affiliateAddress: storedQuote.affiliateAddress,
      affiliateBps: Number.isFinite(parsedBps) ? parsedBps : undefined,
      origin: 'api',
      metadata: storedQuote.metadata,
    }),
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
    const postResponse = await fetch(`${env.SWAP_SERVICE_BASE_URL}/swaps`, {
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
