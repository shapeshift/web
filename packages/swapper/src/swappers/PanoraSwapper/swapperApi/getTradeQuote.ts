import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { getPanoraTradeData } from './getPanoraTradeData'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: `receiveAddress is required`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const slippagePercentage = bnOrZero(
    slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Panora),
  )
    .times(100)
    .toNumber()

  const tradeDataResult = await getPanoraTradeData({
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    receiveAddress,
    affiliateBps,
    slippagePercentage,
    config: deps.config,
  })

  if (tradeDataResult.isErr()) return Err(tradeDataResult.unwrapErr())

  const { buyAmountAfterFeesCryptoBaseUnit, rate, protocolFees } = tradeDataResult.unwrap()

  try {
    // Fixed gas estimate for Aptos transactions (100 octas per gas unit * ~2000 gas units)
    const estimatedGas = '200000'

    const tradeQuote: TradeQuote = {
      id: uuid(),
      quoteOrRate: 'quote',
      rate,
      affiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Panora,
      steps: [
        {
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: estimatedGas,
            chainSpecific: {
              gasUnitPrice: '100',
              maxGasAmount: '2000',
            },
          },
          rate,
          source: SwapperName.Panora,
          buyAsset,
          sellAsset,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: undefined,
          affiliateFee: buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: sellAmount,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
            isEstimate: true,
          }),
        },
      ],
    }

    return tradeDataResult.map(() => [tradeQuote])
  } catch (error) {
    console.error(error)
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Panora quote',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
