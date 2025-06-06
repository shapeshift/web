import { assertUnreachable, BigNumber, bn, bnOrZero } from '@shapeshiftoss/utils'
import assert from 'assert'
import type { Address } from 'viem'

import type { SwapperConfig, TradeQuoteStep } from '../../../../types'
import type { ThorEvmTradeQuote } from '../../types'
import { getCallDataFromQuote } from '../../utils/getCallDataFromQuote'
import { TradeType } from '../../utils/longTailHelpers'
import { getThorTxInfo as getEvmThorTxInfo } from './getThorTxData'

export const getEvmData = async ({
  config,
  step,
  tradeQuote,
}: {
  config: SwapperConfig
  step: TradeQuoteStep
  tradeQuote: ThorEvmTradeQuote
}) => {
  const {
    router,
    vault,
    aggregator,
    memo: tcMemo,
    tradeType,
    expiry,
    longtailData,
    slippageTolerancePercentageDecimal,
  } = tradeQuote

  if (!tcMemo) throw new Error('Cannot execute Tx without a memo')

  const { sellAmountIncludingProtocolFeesCryptoBaseUnit, sellAsset } = step

  switch (tradeType) {
    case TradeType.L1ToL1: {
      const data = await getCallDataFromQuote({
        data: tradeQuote.data,
        tradeType,
        sellAsset,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: tcMemo,
        expiry,
        config,
        longtailData,
        slippageTolerancePercentageDecimal,
        router,
        vault,
      })

      return { data, to: router }
    }
    case TradeType.LongTailToL1: {
      assert(aggregator, 'aggregator required for thorchain longtail to l1 swaps')

      const expectedAmountOut = longtailData?.longtailToL1ExpectedAmountOut ?? '0'

      // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
      assert(
        bnOrZero(expectedAmountOut).gt(0),
        'expected expectedAmountOut to be a positive amount',
      )

      const amountOutMin = BigInt(
        bnOrZero(expectedAmountOut)
          .times(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
          .toFixed(0, BigNumber.ROUND_UP),
      )

      // Paranoia: ensure we have this to prevent sandwich attacks on the first step of a LongtailToL1 trade.
      assert(amountOutMin > 0n, 'expected expectedAmountOut to be a positive amount')

      const tcVault = vault as Address

      const data = await getCallDataFromQuote({
        data: tradeQuote.data,
        tradeType,
        sellAsset,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: tcMemo,
        expiry,
        config,
        longtailData,
        slippageTolerancePercentageDecimal,
        router: aggregator,
        vault: tcVault,
      })

      return { data, to: aggregator }
    }
    case TradeType.L1ToLongTail: {
      const expectedAmountOut = longtailData?.L1ToLongtailExpectedAmountOut ?? '0'

      // Paranoia assertion - expectedAmountOut should never be 0 as it would likely lead to a loss of funds.
      assert(
        bnOrZero(expectedAmountOut).gt(0),
        'expected expectedAmountOut to be a positive amount',
      )

      const { router: updatedRouter } = await getEvmThorTxInfo({
        sellAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: tcMemo,
        expiry,
        config,
      })

      assert(router, 'router required for l1 to thorchain longtail swaps')

      const data = await getCallDataFromQuote({
        data: tradeQuote.data,
        tradeType,
        sellAsset,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        memo: tcMemo,
        expiry,
        config,
        longtailData,
        slippageTolerancePercentageDecimal,
        router,
        vault,
      })

      return { data, to: updatedRouter }
    }
    case TradeType.LongTailToLongTail:
      throw Error(`Unsupported trade type: ${TradeType}`)
    default:
      return assertUnreachable(tradeType)
  }
}
