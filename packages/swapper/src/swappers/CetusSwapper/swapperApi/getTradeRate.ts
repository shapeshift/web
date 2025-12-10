import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type { GetTradeRateInput, SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getCetusTradeData } from './getCetusTradeData'

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const tradeDataResult = await getCetusTradeData(
    {
      sellAsset,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    },
    deps,
  )

  if (tradeDataResult.isErr()) return Err(tradeDataResult.unwrapErr())

  const {
    buyAmountAfterFeesCryptoBaseUnit,
    rate,
    addressForFeeEstimate,
    sellCoinType,
    protocolFees,
    adapter,
  } = tradeDataResult.unwrap()

  try {
    const { fast: feeDataFast } = await adapter.getFeeData({
      to: addressForFeeEstimate,
      value: sellAmount,
      chainSpecific: {
        from: addressForFeeEstimate,
        tokenId: sellCoinType,
      },
    })

    const tradeRate: TradeRate = {
      id: uuid(),
      quoteOrRate: 'rate',
      rate,
      affiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Cetus,
      steps: [
        {
          accountNumber: undefined,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: feeDataFast.txFee,
          },
          rate,
          source: SwapperName.Cetus,
          buyAsset,
          sellAsset,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: undefined,
        },
      ],
    }

    return tradeDataResult.map(() => [tradeRate])
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Cetus rate',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
