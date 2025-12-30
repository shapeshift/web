import { getQuotes } from '@avnu/avnu-sdk'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { AVNU_SUPPORTED_CHAIN_IDS } from '../utils/constants'
import { getTokenAddress } from '../utils/helpers'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    receiveAddress,
  } = input

  if (!AVNU_SUPPORTED_CHAIN_IDS.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `Chain ${sellAsset.chainId} is not supported by AVNU`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (!AVNU_SUPPORTED_CHAIN_IDS.includes(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `Chain ${buyAsset.chainId} is not supported by AVNU`,
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  try {
    const sellTokenAddress = getTokenAddress(sellAsset)
    const buyTokenAddress = getTokenAddress(buyAsset)

    const quotes = await getQuotes({
      sellTokenAddress,
      buyTokenAddress,
      sellAmount: BigInt(sellAmount),
      size: 1,
    })

    if (!quotes || quotes.length === 0) {
      return Err(
        makeSwapErrorRight({
          message: 'No quotes available for this trade pair',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const bestQuote = quotes[0]

    if (!bestQuote) {
      return Err(
        makeSwapErrorRight({
          message: 'No valid quote returned from AVNU',
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const buyAmountAfterFeesCryptoBaseUnit = bestQuote.buyAmount.toString()

    const sellAdapter = deps.assertGetStarknetChainAdapter(sellAsset.chainId)
    const feeData = await sellAdapter.getFeeData()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmount,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const protocolFees = affiliateBps
      ? {
          [buyAsset.assetId]: {
            amountCryptoBaseUnit: bn(buyAmountAfterFeesCryptoBaseUnit)
              .times(affiliateBps)
              .div(10000)
              .toFixed(0),
            requiresBalance: false,
            asset: buyAsset,
          },
        }
      : {}

    const tradeRate: TradeRate = {
      id: uuid(),
      receiveAddress,
      affiliateBps,
      rate,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Avnu),
      quoteOrRate: 'rate' as const,
      swapperName: SwapperName.Avnu,
      steps: [
        {
          accountNumber: undefined,
          allowanceContract: '0x0',
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          buyAsset,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: feeData.fast.txFee,
          },
          rate,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          sellAsset,
          source: SwapperName.Avnu,
          estimatedExecutionTimeMs: undefined,
        },
      ],
    }

    return Ok([tradeRate])
  } catch (error) {
    console.error('[AVNU] getTradeRate error:', error)

    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting AVNU rate',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
