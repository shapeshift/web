import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn, convertPrecision } from '@shapeshiftoss/utils'
import { Err } from '@sniptt/monads'
import type { Omniston, QuoteRequest, QuoteResponseEvent } from '@ston-fi/omniston-sdk'
import { Blockchain } from '@ston-fi/omniston-sdk'

import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { OmnistonAssetAddress, QuoteResult, TonAssetValidationResult } from '../types'

export const isTonAsset = (asset: Asset): boolean => {
  return asset.chainId === KnownChainIds.TonMainnet
}

export const assetToOmnistonAddress = (asset: Asset): OmnistonAssetAddress | null => {
  if (!isTonAsset(asset)) return null

  const { assetNamespace, assetReference } = fromAssetId(asset.assetId)

  if (assetNamespace === 'slip44') {
    return {
      blockchain: Blockchain.TON,
      address: 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
    }
  }

  if (assetNamespace === 'jetton') {
    return { blockchain: Blockchain.TON, address: assetReference }
  }

  return null
}

export const validateTonAssets = (sellAsset: Asset, buyAsset: Asset): TonAssetValidationResult => {
  if (sellAsset.chainId !== KnownChainIds.TonMainnet) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[Stonfi] Unsupported sell asset chain: ${sellAsset.chainId}`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      ),
    }
  }

  if (buyAsset.chainId !== KnownChainIds.TonMainnet) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[Stonfi] Cross-chain swaps not supported`,
          code: TradeQuoteError.CrossChainNotSupported,
        }),
      ),
    }
  }

  const bidAssetAddress = assetToOmnistonAddress(sellAsset)
  const askAssetAddress = assetToOmnistonAddress(buyAsset)

  if (!bidAssetAddress || !askAssetAddress) {
    return {
      isValid: false,
      error: Err(
        makeSwapErrorRight({
          message: `[Stonfi] Unable to convert assets to Omniston addresses`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      ),
    }
  }

  return {
    isValid: true,
    bidAssetAddress,
    askAssetAddress,
  }
}

export const calculateRate = (
  buyAmountCryptoBaseUnit: string,
  sellAmountCryptoBaseUnit: string,
  buyAssetPrecision: number,
  sellAssetPrecision: number,
): string => {
  if (bn(buyAmountCryptoBaseUnit).gt(0) && bn(sellAmountCryptoBaseUnit).gt(0)) {
    return convertPrecision({
      value: buyAmountCryptoBaseUnit,
      inputExponent: buyAssetPrecision,
      outputExponent: sellAssetPrecision,
    })
      .dividedBy(bn(sellAmountCryptoBaseUnit))
      .toFixed()
  }
  return '0'
}
export const slippageDecimalToBps = (
  slippageTolerancePercentageDecimal: string | undefined,
  defaultSlippageBps: number,
): number => {
  if (!slippageTolerancePercentageDecimal) {
    return defaultSlippageBps
  }

  const parsed = parseFloat(slippageTolerancePercentageDecimal)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return defaultSlippageBps
  }

  return Math.round(parsed * 10000)
}

export const tonAddressToOmnistonAddress = (address: string): OmnistonAssetAddress => {
  return {
    blockchain: Blockchain.TON,
    address,
  }
}

export const affiliateBpsToNumber = (affiliateBps: string | undefined): number => {
  if (!affiliateBps) return 0
  const parsed = parseInt(affiliateBps, 10)
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) return 0
  return parsed
}

export const waitForQuote = (
  omniston: Omniston,
  request: QuoteRequest,
  timeoutMs: number,
): Promise<QuoteResult> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      resolve({ type: 'timeout' })
    }, timeoutMs)

    const subscription = omniston.requestForQuote(request).subscribe({
      next: (event: QuoteResponseEvent) => {
        if (event.type === 'quoteUpdated' && event.quote) {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve({ type: 'success', quote: event.quote })
        } else if (event.type === 'noQuote') {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve({ type: 'noQuote' })
        }
      },
      error: err => {
        clearTimeout(timer)
        subscription.unsubscribe()
        resolve({ type: 'error', error: err })
      },
    })
  })
}
