import { ethChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import type { GetArbitrumBridgeStepDataArgs } from './getArbitrumBridgeStepData'
import {
  assertValidTrade,
  getArbitrumBridgeAllowanceContract,
  getArbitrumBridgeType,
} from './helpers'

type ArbitrumBridgeTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  stepDataArgs: Omit<GetArbitrumBridgeStepDataArgs, 'type' | 'input' | 'from' | 'receiveAddress'>
}

export const getArbitrumBridgeTradeContext = async ({
  input,
  deps,
}: {
  input: GetEvmTradeQuoteInputBase | GetEvmTradeRateInput
  deps: SwapperDeps
}): Promise<Result<ArbitrumBridgeTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const assertion = await assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const isDeposit = sellAsset.chainId === ethChainId

  // 15 minutes for deposits, 7 days for withdrawals
  const estimatedExecutionTimeMs = isDeposit ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000

  // 1/1 when bridging on Arbitrum bridge
  const rate = '1'

  const bridgeType = getArbitrumBridgeType({ sellAsset, buyAsset })
  const allowanceContract = await getArbitrumBridgeAllowanceContract({ bridgeType, sellAsset })

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.ArbitrumBridge,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal: getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.ArbitrumBridge,
      ),
    },
    stepCommon: {
      allowanceContract,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.ArbitrumBridge,
      estimatedExecutionTimeMs,
    },
    stepDataArgs: {
      bridgeType,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      deps,
    },
  })
}
