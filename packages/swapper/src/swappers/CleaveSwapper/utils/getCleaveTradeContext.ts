import { BigNumber, bn, convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  SwapErrorRight,
  SwapperDeps,
  SwapSource,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../../utils/helpers'
import type { CleaveTradeQuoteInput, CleaveTradeRateInput } from '../types'
import { CLEAVE_DEADLINE_SECONDS } from './constants'
import { fetchFromCleave } from './fetchFromCleave'
import type { GetCleaveStepDataArgs } from './getCleaveStepData'
import { assertValidTrade, getCleaveRouteVenues } from './helpers'

type CleaveTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  deadline: number
  stepDataArgs: Omit<GetCleaveStepDataArgs, 'type' | 'input'>
}

export const getCleaveTradeContext = async ({
  input,
  deps,
  from,
  to,
}: {
  input: CleaveTradeQuoteInput | CleaveTradeRateInput
  deps: SwapperDeps
  from: string
  to: string
}): Promise<Result<CleaveTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const maybeChainId = assertValidTrade({ sellAsset, buyAsset, affiliateBps })
  if (maybeChainId.isErr()) return Err(maybeChainId.unwrapErr())
  const chainId = maybeChainId.unwrap()

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Cleave)

  const referralBps = bn(affiliateBps).toNumber()
  const deadline = Math.floor(Date.now() / 1000) + CLEAVE_DEADLINE_SECONDS

  const maybeQuote = await fetchFromCleave({
    input,
    chainId,
    recipient: to,
    deadline,
    slippageBps: convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal)
      .integerValue(BigNumber.ROUND_DOWN)
      .toNumber(),
    referralBps,
    referrer: referralBps > 0 ? getTreasuryAddressFromChainId(chainId) : zeroAddress,
    baseUrl: deps.config.VITE_CLEAVE_BASE_URL,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const { amountOutNet, fees } = quote
  const referralFee = fees.referral.amount

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: amountOutNet,
    sellAsset,
    buyAsset,
  })

  const venues = getCleaveRouteVenues(quote.route)
  const source: SwapSource = venues.length
    ? `${SwapperName.Cleave} • ${venues.join(', ')}`
    : SwapperName.Cleave

  const allowanceContract = isNativeEvmAsset(sellAsset.assetId)
    ? ''
    : quote.execution.approval?.spender ?? ''

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Cleave,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract,
      rate,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit: bn(amountOutNet).plus(referralFee).toFixed(),
      buyAmountAfterFeesCryptoBaseUnit: amountOutNet,
      source,
      affiliateFee: bn(referralFee).gt(0)
        ? { assetId: buyAsset.assetId, amountCryptoBaseUnit: referralFee, asset: buyAsset }
        : undefined,
    },
    deadline: deadline * 1000,
    stepDataArgs: {
      transaction: quote.tx,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      from,
      deps,
    },
  })
}
