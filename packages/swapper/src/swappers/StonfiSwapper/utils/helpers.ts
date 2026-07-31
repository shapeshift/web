import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn, convertPrecision } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type {
  Omniston,
  Quote,
  QuoteRequest,
  QuoteResponseEvent,
  TradeStatus as OmnistonTradeStatus,
} from '@ston-fi/omniston-sdk'
import { Blockchain } from '@ston-fi/omniston-sdk'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { OmnistonAssetAddress, QuoteResult, StonfiTransactionData } from '../types'
import { omnistonManager } from './omnistonManager'

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

export const assertValidTrade = ({
  sellAsset,
  buyAsset,
}: {
  sellAsset: Asset
  buyAsset: Asset
}): Result<
  { bidAssetAddress: OmnistonAssetAddress; askAssetAddress: OmnistonAssetAddress },
  SwapErrorRight
> => {
  if (sellAsset.chainId !== KnownChainIds.TonMainnet) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Unsupported sell asset chain: ${sellAsset.chainId}`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (buyAsset.chainId !== KnownChainIds.TonMainnet) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Cross-chain swaps not supported`,
        code: TradeQuoteError.CrossChainNotSupported,
      }),
    )
  }

  const bidAssetAddress = assetToOmnistonAddress(sellAsset)
  const askAssetAddress = assetToOmnistonAddress(buyAsset)

  if (!bidAssetAddress || !askAssetAddress) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Unable to convert assets to Omniston addresses`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  return Ok({ bidAssetAddress, askAssetAddress })
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

export const buildStonfiSpecific = (
  quote: Quote,
  bidAssetAddress: OmnistonAssetAddress,
  askAssetAddress: OmnistonAssetAddress,
): StonfiTransactionData => ({
  quoteId: quote.quoteId,
  resolverId: quote.resolverId,
  resolverName: quote.resolverName,
  tradeStartDeadline: quote.tradeStartDeadline,
  gasBudget: quote.gasBudget,
  bidAssetAddress: quote.bidAssetAddress ?? bidAssetAddress,
  askAssetAddress: quote.askAssetAddress ?? askAssetAddress,
  bidUnits: quote.bidUnits,
  askUnits: quote.askUnits,
  referrerAddress: quote.referrerAddress,
  referrerFeeAsset: quote.referrerFeeAsset,
  referrerFeeUnits: quote.referrerFeeUnits,
  protocolFeeAsset: quote.protocolFeeAsset,
  protocolFeeUnits: quote.protocolFeeUnits,
  quoteTimestamp: quote.quoteTimestamp,
  estimatedGasConsumption: quote.estimatedGasConsumption,
  params: quote.params,
})

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

export const waitForFirstTradeStatus = (
  request: {
    quoteId: string
    traderWalletAddress: { blockchain: number; address: string }
    outgoingTxHash: string
  },
  timeoutMs: number,
): Promise<OmnistonTradeStatus | null> => {
  const omniston = omnistonManager.getInstance()

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      resolve(null)
    }, timeoutMs)

    const subscription = omniston.trackTrade(request).subscribe({
      next: (status: OmnistonTradeStatus) => {
        clearTimeout(timer)
        subscription.unsubscribe()
        resolve(status)
      },
      error: err => {
        console.error('[Stonfi] trackTrade error:', err)
        clearTimeout(timer)
        resolve(null)
      },
    })
  })
}
