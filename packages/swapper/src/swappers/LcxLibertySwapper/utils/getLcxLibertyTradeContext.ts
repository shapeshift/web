import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { LcxLibertyQuote, LcxLibertyTradeQuoteInput, LcxLibertyTradeRateInput } from '../types'
import type { LcxLibertySupportedChainId } from './constants'
import { LCX_LIBERTY_ROUTER_BY_CHAIN_ID } from './constants'
import { fetchLcxLibertyQuote } from './fetchFromLcxLiberty'
import type { GetLcxLibertyStepDataArgs } from './getLcxLibertyStepData'
import { assertValidTrade, getLcxLibertySlippageBps } from './helpers'

type LcxLibertyTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  chainId: LcxLibertySupportedChainId
  quote: LcxLibertyQuote
  stepDataArgs: Omit<GetLcxLibertyStepDataArgs, 'type' | 'input' | 'from'>
}

export const getLcxLibertyTradeContext = async ({
  input,
  deps,
}: {
  input: LcxLibertyTradeQuoteInput | LcxLibertyTradeRateInput
  deps: SwapperDeps
}): Promise<Result<LcxLibertyTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const maybeChainId = assertValidTrade({ sellAsset, buyAsset })
  if (maybeChainId.isErr()) return Err(maybeChainId.unwrapErr())
  const chainId = maybeChainId.unwrap()

  const slippageBps = getLcxLibertySlippageBps(
    input.slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.LcxLiberty),
  )

  const maybeQuote = await fetchLcxLibertyQuote({
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    slippageBps,
    baseUrl: deps.config.VITE_LCX_LIBERTY_BASE_URL,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const buyAmountCryptoBaseUnit = quote.output.amount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: quote.input.amount,
    buyAmountCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = isNativeEvmAsset(sellAsset.assetId)
    ? ''
    : LCX_LIBERTY_ROUTER_BY_CHAIN_ID[chainId]

  return Ok<LcxLibertyTradeContext, SwapErrorRight>({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.LcxLiberty,
      // No integrator fee is requested from LCX Liberty DEX, so none is charged
      affiliateBps: '0',
      slippageTolerancePercentageDecimal: bn(slippageBps).div(10_000).toFixed(),
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract,
      rate,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
      source: SwapperName.LcxLiberty,
    },
    protocolFees: {},
    chainId,
    quote,
    stepDataArgs: {
      deps,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      providerNetworkFeeCryptoBaseUnit: quote.gasEstimateWei ?? undefined,
    },
  })
}
