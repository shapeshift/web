import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getCetusTradeData } from './getCetusTradeData'

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
    const getFeeDataInput: GetFeeDataInput<KnownChainIds.SuiMainnet> = {
      to: addressForFeeEstimate,
      value: sellAmount,
      chainSpecific: {
        from: addressForFeeEstimate,
        tokenId: sellCoinType,
      },
    }

    const feeData = await adapter.getFeeData(getFeeDataInput)

    const tradeQuote: TradeQuote = {
      id: uuid(),
      quoteOrRate: 'quote',
      rate,
      affiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Cetus,
      steps: [
        {
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: feeData.fast.txFee,
            chainSpecific: {
              gasBudget: feeData.fast.chainSpecific.gasBudget,
              gasPrice: feeData.fast.chainSpecific.gasPrice,
            },
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

    return tradeDataResult.map(() => [tradeQuote])
  } catch (error) {
    console.error(error)
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Cetus quote',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
