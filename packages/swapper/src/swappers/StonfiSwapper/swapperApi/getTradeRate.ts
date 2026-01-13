import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Err, Ok } from '@sniptt/monads'
import type { Quote, QuoteResponseEvent } from '@ston-fi/omniston-sdk'
import { Blockchain, Omniston, SettlementMethod } from '@ston-fi/omniston-sdk'

import type { GetTradeRateInput, TradeRate, TradeRateResult } from '../../../types'
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
    return { blockchain: Blockchain.TON, address: 'native' }
  }

  if (assetNamespace === 'jetton') {
    return { blockchain: Blockchain.TON, address: assetReference }
  }

  return null
}

const waitForQuote = (
  omniston: Omniston,
  request: Parameters<typeof omniston.requestForQuote>[0],
  timeoutMs: number,
): Promise<Quote | null> => {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      resolve(null)
    }, timeoutMs)

    const subscription = omniston.requestForQuote(request).subscribe({
      next: (event: QuoteResponseEvent) => {
        if (event.type === 'quoteUpdated' && event.quote) {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve(event.quote)
        } else if (event.type === 'noQuote') {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve(null)
        }
      },
      error: () => {
        clearTimeout(timer)
        resolve(null)
      },
    })
  })
}

export const getTradeRate = async (input: GetTradeRateInput): Promise<TradeRateResult> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
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

    const quote = await waitForQuote(
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

    if (!quote) {
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] No quote available for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

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

    const tradeRate: TradeRate = {
      id: quote.quoteId,
      rate,
      receiveAddress,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? String(STONFI_DEFAULT_SLIPPAGE_BPS / 10000),
      quoteOrRate: 'rate',
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
          accountNumber: undefined,
          allowanceContract: '0x0000000000000000000000000000000000000000',
          estimatedExecutionTimeMs: 30000,
          stonfiSpecific: {
            quoteId: quote.quoteId,
            resolverId: quote.resolverId,
            resolverName: quote.resolverName,
            tradeStartDeadline: quote.tradeStartDeadline,
            gasBudget: quote.gasBudget,
          },
        },
      ],
    }

    return Ok([tradeRate])
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Error getting rate: ${err}`,
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  } finally {
    omniston.close()
  }
}
