import { tronChainId } from '@shapeshiftoss/caip'
import { bn, contractAddressOrUndefined } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  GetTronTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { DEFAULT_SLIPPAGE_PERCENTAGE, SUNIO_SMART_ROUTER_CONTRACT } from './constants'
import { fetchSunioQuote } from './fetchFromSunio'
import { isSupportedChainId } from './helpers/helpers'
import { sunioServiceFactory } from './sunioService'

export async function getQuoteOrRate(
  input: GetTronTradeQuoteInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>>

export async function getQuoteOrRate(
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate, SwapErrorRight>>

export async function getQuoteOrRate(
  input: GetTradeRateInput | GetTronTradeQuoteInput | CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote | TradeRate, SwapErrorRight>> {
  try {
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

    const bestRoute = quoteResponse.data[0]

    if (!bestRoute) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] No routes available',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const isQuote = input.quoteOrRate === 'quote'

    // For quotes, receiveAddress is required
    if (isQuote && !receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] receiveAddress is required for quotes',
          code: TradeQuoteError.InternalError,
        }),
      )
    }

    // Fetch network fees for both quotes and rates (when wallet connected)
    let networkFeeCryptoBaseUnit: string | undefined = undefined

    // Estimate fees when we have an address to estimate from
    if (receiveAddress) {
      try {
        const adapter = assertGetTronChainAdapter(sellAsset.chainId)
        const contractAddress = contractAddressOrUndefined(sellAsset.assetId)

        const feeData = await adapter.getFeeData({
          to: SUNIO_SMART_ROUTER_CONTRACT,
          value: contractAddress ? '0' : sellAmountIncludingProtocolFeesCryptoBaseUnit,
          sendMax: false,
          chainSpecific: {
            from: receiveAddress,
            contractAddress,
          },
        })
        networkFeeCryptoBaseUnit = feeData.fast.txFee
      } catch (error) {
        // For rates, fall back to '0' on estimation failure
        // For quotes, let it error (required for accurate swap)
        if (!isQuote) {
          networkFeeCryptoBaseUnit = '0'
        } else {
          throw error
        }
      }
    }

    const buyAmountCryptoBaseUnit = bn(bestRoute.amountOut)
      .times(bn(10).pow(buyAsset.precision))
      .toFixed(0)

    // Calculate protocol fees only for quotes
    const protocolFeeCryptoBaseUnit = isQuote
      ? bn(bestRoute.fee).times(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)
      : '0'

    const buyAmountAfterFeesCryptoBaseUnit = buyAmountCryptoBaseUnit

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const trade = {
      id: crypto.randomUUID(),
      quoteOrRate: input.quoteOrRate,
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
          ...(isQuote && {
            sunioTransactionMetadata: {
              route: bestRoute,
            },
          }),
        },
      ],
      swapperName: SwapperName.Sunio,
    }

    return Ok(trade as typeof input.quoteOrRate extends 'quote' ? TradeQuote : TradeRate)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: `[Sun.io] Failed to get trade ${input.quoteOrRate}`,
        code: TradeQuoteError.UnknownError,
        cause: error,
      }),
    )
  }
}
