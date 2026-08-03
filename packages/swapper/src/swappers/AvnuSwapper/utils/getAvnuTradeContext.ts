import { getQuotes } from '@avnu/avnu-sdk'
import { starknetChainId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetStarknetTradeQuoteInput,
  GetStarknetTradeRateInput,
  QuoteFeeData,
  SwapErrorRight,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { getTreasuryAddressFromChainId, normalizeEpochToMs } from '../../../utils/helpers'
import { assertValidTrade, getTokenAddress } from './helpers'

type AvnuTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  quoteId: string
  sellTokenAddress: string
  // Provider quote expiry (epoch ms) when supplied, consumed by the quote arm only
  deadline: number | undefined
}

export const getAvnuTradeContext = async ({
  input,
  takerAddress,
}: {
  input: GetStarknetTradeQuoteInput | GetStarknetTradeRateInput
  takerAddress: string | undefined
}): Promise<Result<AvnuTradeContext, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    slippageTolerancePercentageDecimal,
    affiliateBps,
  } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const sellTokenAddress = getTokenAddress(sellAsset)
  const buyTokenAddress = getTokenAddress(buyAsset)

  try {
    const quotes = await getQuotes({
      sellTokenAddress,
      buyTokenAddress,
      sellAmount: BigInt(sellAmount),
      takerAddress,
      size: 1,
      integratorFees: affiliateBps ? BigInt(affiliateBps) : undefined,
      integratorFeeRecipient: getTreasuryAddressFromChainId(starknetChainId),
      integratorName: 'shapeshift',
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

    return Ok({
      tradeCommon: {
        id: uuid(),
        rate,
        affiliateBps,
        slippageTolerancePercentageDecimal:
          slippageTolerancePercentageDecimal ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Avnu),
        swapperName: SwapperName.Avnu,
      },
      stepCommon: {
        allowanceContract: '',
        buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        buyAsset,
        rate,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
        sellAsset,
        source: SwapperName.Avnu,
        estimatedExecutionTimeMs: undefined,
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: sellAmount,
          buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        }),
      },
      protocolFees,
      quoteId: bestQuote.quoteId,
      sellTokenAddress,
      deadline: bestQuote.expiry ? normalizeEpochToMs(bestQuote.expiry) : undefined,
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting AVNU quote',
        code: TradeQuoteError.QueryFailed,
        cause: error,
      }),
    )
  }
}
