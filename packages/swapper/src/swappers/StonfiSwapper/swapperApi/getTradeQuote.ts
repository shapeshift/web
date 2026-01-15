import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Err, Ok } from '@sniptt/monads'
import type { Quote, QuoteResponseEvent } from '@ston-fi/omniston-sdk'
import { Blockchain, Omniston, SettlementMethod } from '@ston-fi/omniston-sdk'

import type { CommonTradeQuoteInput, TradeQuote, TradeQuoteResult } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import {
  STONFI_DEFAULT_SLIPPAGE_BPS,
  STONFI_QUOTE_TIMEOUT_MS,
  STONFI_WEBSOCKET_URL,
} from '../utils/constants'
import { isTonAsset } from '../utils/helpers'

const STONFI_SWAP_SOURCE = SwapperName.Stonfi

const assetToOmnistonAddress = (asset: Asset): { blockchain: number; address: string } | null => {
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

type QuoteResult =
  | { type: 'success'; quote: Quote }
  | { type: 'noQuote' }
  | { type: 'timeout' }
  | { type: 'error'; error: unknown }

const waitForQuote = (
  omniston: Omniston,
  request: Parameters<typeof omniston.requestForQuote>[0],
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

export const getTradeQuote = async (input: CommonTradeQuoteInput): Promise<TradeQuoteResult> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentageDecimal,
  } = input

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

  console.log('bidAssetAddress', bidAssetAddress)
  console.log('askAssetAddress', askAssetAddress)

  if (!bidAssetAddress || !askAssetAddress) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Unable to convert assets to Omniston addresses`,
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

  const omniston = new Omniston({ apiUrl: STONFI_WEBSOCKET_URL })

  try {
    const slippageBps = slippageTolerancePercentageDecimal
      ? Math.round(parseFloat(slippageTolerancePercentageDecimal) * 10000)
      : STONFI_DEFAULT_SLIPPAGE_BPS

    const quoteResult = await waitForQuote(
      omniston,
      {
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        bidAssetAddress,
        askAssetAddress,
        amount: { bidUnits: sellAmountIncludingProtocolFeesCryptoBaseUnit },
        settlementParams: {
          maxPriceSlippageBps: slippageBps,
          gaslessSettlement: 'GASLESS_SETTLEMENT_PROHIBITED',
        },
      },
      STONFI_QUOTE_TIMEOUT_MS,
    )

    if (quoteResult.type === 'error') {
      console.error('[Stonfi] Quote request error:', quoteResult.error)
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] Connection error while fetching quote`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    if (quoteResult.type === 'timeout') {
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] Quote request timed out`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    if (quoteResult.type === 'noQuote') {
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] No quote available for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const quote = quoteResult.quote
    const buyAmountCryptoBaseUnit = quote.askUnits
    const networkFeeCryptoBaseUnit = quote.gasBudget

    const rate =
      BigInt(buyAmountCryptoBaseUnit) > 0n &&
      BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit) > 0n
        ? (
            Number(buyAmountCryptoBaseUnit) /
            Math.pow(10, buyAsset.precision) /
            (Number(sellAmountIncludingProtocolFeesCryptoBaseUnit) /
              Math.pow(10, sellAsset.precision))
          ).toString()
        : '0'

    const tradeQuote: TradeQuote = {
      id: quote.quoteId,
      rate,
      receiveAddress,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? String(STONFI_DEFAULT_SLIPPAGE_BPS / 10000),
      quoteOrRate: 'quote',
      swapperName: SwapperName.Stonfi,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: undefined,
          },
          rate,
          source: STONFI_SWAP_SOURCE,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: '0x0000000000000000000000000000000000000000',
          estimatedExecutionTimeMs: 30000,
          stonfiSpecific: {
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
          },
        },
      ],
    }

    return Ok([tradeQuote])
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Error getting quote: ${err}`,
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  } finally {
    omniston.close()
  }
}
