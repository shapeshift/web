import { tronChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetTronTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { DEFAULT_SLIPPAGE_PERCENTAGE, SUNIO_SMART_ROUTER_CONTRACT } from '../utils/constants'
import { fetchSunioQuote } from '../utils/fetchFromSunio'
import { isSupportedChainId } from '../utils/helpers/helpers'
import { sunioServiceFactory } from '../utils/sunioService'

export const getSunioTradeQuote = async (
  input: GetTronTradeQuoteInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>> => {
  try {
    console.log('[Sun.io Quote] Input:', JSON.stringify({
      sellAsset: { assetId: input.sellAsset.assetId, symbol: input.sellAsset.symbol },
      buyAsset: { assetId: input.buyAsset.assetId, symbol: input.buyAsset.symbol },
      sellAmount: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      receiveAddress: input.receiveAddress,
      sendAddress: (input as any).sendAddress,
      accountNumber: input.accountNumber,
    }, null, 2))

    const {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      receiveAddress,
      accountNumber,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    } = input

    const { assertGetTronChainAdapter } = deps

    if (!isSupportedChainId(sellAsset.chainId)) {
      return Err(
        makeSwapErrorRight({
          message: `[${SwapperName.Sunio}] Unsupported chainId: ${sellAsset.chainId}`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: sellAsset.chainId },
        }),
      )
    }

    if (sellAsset.chainId !== buyAsset.chainId) {
      return Err(
        makeSwapErrorRight({
          message: `[${SwapperName.Sunio}] Cross-chain not supported`,
          code: TradeQuoteError.CrossChainNotSupported,
        }),
      )
    }

    if (sellAsset.chainId !== tronChainId) {
      return Err(
        makeSwapErrorRight({
          message: `[${SwapperName.Sunio}] Only TRON chain supported`,
          code: TradeQuoteError.UnsupportedChain,
        }),
      )
    }

    const service = sunioServiceFactory()
    const maybeQuoteResponse = await fetchSunioQuote(
      {
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
      service,
    )

    if (maybeQuoteResponse.isErr()) {
      return Err(maybeQuoteResponse.unwrapErr())
    }

    const quoteResponse = maybeQuoteResponse.unwrap()

    console.log('[Sun.io Quote] API Response:', JSON.stringify(quoteResponse, null, 2))

    const bestRoute = quoteResponse.data[0]

    if (!bestRoute) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] No routes available',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const adapter = assertGetTronChainAdapter(sellAsset.chainId)

    const feeData = await adapter.getFeeData({
      to: receiveAddress,
      value: '0',
      sendMax: false,
    })

    const networkFeeCryptoBaseUnit = feeData.fast.txFee

    const buyAmountCryptoBaseUnit = bn(bestRoute.amountOut)
      .times(bn(10).pow(buyAsset.precision))
      .toFixed(0)

    const protocolFeeCryptoBaseUnit = bn(bestRoute.fee)
      .times(sellAmountIncludingProtocolFeesCryptoBaseUnit)
      .toFixed(0)

    const buyAmountAfterFeesCryptoBaseUnit = buyAmountCryptoBaseUnit

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    console.log('[Sun.io Quote] Calculated values:', JSON.stringify({
      buyAmountCryptoBaseUnit,
      protocolFeeCryptoBaseUnit,
      networkFeeCryptoBaseUnit,
      rate,
    }, null, 2))

    const tradeQuote: TradeQuote = {
      id: crypto.randomUUID(),
      quoteOrRate: 'quote',
      rate,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
      receiveAddress,
      affiliateBps,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees:
              protocolFeeCryptoBaseUnit !== '0'
                ? {
                    [sellAsset.assetId]: {
                      amountCryptoBaseUnit: protocolFeeCryptoBaseUnit,
                      requiresBalance: false,
                      asset: sellAsset,
                    },
                  }
                : {},
          },
          rate,
          source: SwapperName.Sunio,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: SUNIO_SMART_ROUTER_CONTRACT,
          estimatedExecutionTimeMs: undefined,
          sunioTransactionMetadata: {
            route: bestRoute,
          },
        },
      ],
      swapperName: SwapperName.Sunio,
    }

    console.log('[Sun.io Quote] Final TradeQuote:', JSON.stringify({
      id: tradeQuote.id,
      rate: tradeQuote.rate,
      receiveAddress: tradeQuote.receiveAddress,
      steps: tradeQuote.steps.map(s => ({
        accountNumber: s.accountNumber,
        allowanceContract: s.allowanceContract,
        metadata: s.sunioTransactionMetadata,
      })),
    }, null, 2))

    return Ok(tradeQuote)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: '[Sun.io] Failed to get trade quote',
        code: TradeQuoteError.UnknownError,
        cause: error,
      }),
    )
  }
}
