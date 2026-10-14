import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  SwapSource,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import { isNativeEvmAsset, normalizeEpochToMs } from '../../../utils/helpers'
import type { FyndTradeQuoteInput, FyndTradeRateInput } from '../types'
import { fetchFromFynd } from './fetchFromFynd'
import type { GetFyndStepDataArgs } from './getFyndStepData'
import { assertValidTrade, getFyndClientFeeBps, getFyndRouteProtocols } from './helpers'

type FyndTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  deadline: number | undefined
  stepDataArgs: Omit<GetFyndStepDataArgs, 'type' | 'input'>
}

export const getFyndTradeContext = async ({
  input,
  deps,
  from,
  to,
}: {
  input: FyndTradeQuoteInput | FyndTradeRateInput
  deps: SwapperDeps
  from: string
  to: string
}): Promise<Result<FyndTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const maybeChainId = assertValidTrade({ sellAsset, buyAsset })
  if (maybeChainId.isErr()) return Err(maybeChainId.unwrapErr())
  const chainId = maybeChainId.unwrap()

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Fynd)

  const clientFeeBps = getFyndClientFeeBps(affiliateBps)

  const maybeQuote = await fetchFromFynd({
    input,
    chainId,
    sender: from,
    receiver: to,
    slippageTolerancePercentageDecimal,
    clientFeeBps,
    baseUrl: deps.config.VITE_FYND_BASE_URL,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const { router_fee: routerFee, client_fee: clientFee } = quote.fee_breakdown

  const buyAmountBeforeFeesCryptoBaseUnit = quote.amount_out
  const buyAmountAfterFeesCryptoBaseUnit = bn(quote.amount_out)
    .minus(routerFee)
    .minus(clientFee)
    .toFixed()

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: quote.amount_in,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const protocols = getFyndRouteProtocols(quote.route?.swaps)
  const source: SwapSource = protocols.length
    ? `${SwapperName.Fynd} • ${protocols.join(', ')}`
    : SwapperName.Fynd

  const allowanceContract = isNativeEvmAsset(sellAsset.assetId) ? '' : quote.transaction.to

  const protocolFees: QuoteFeeData['protocolFees'] = bn(routerFee).gt(0)
    ? {
        [buyAsset.assetId]: {
          amountCryptoBaseUnit: routerFee,
          asset: buyAsset,
          requiresBalance: false,
        },
      }
    : {}

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Fynd,
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
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      source,
      affiliateFee: bn(clientFee).gt(0)
        ? { assetId: buyAsset.assetId, amountCryptoBaseUnit: clientFee, asset: buyAsset }
        : undefined,
    },
    protocolFees,
    deadline: quote.client_fee_deadline ? normalizeEpochToMs(quote.client_fee_deadline) : undefined,
    stepDataArgs: {
      quote,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      from,
      deps,
    },
  })
}
