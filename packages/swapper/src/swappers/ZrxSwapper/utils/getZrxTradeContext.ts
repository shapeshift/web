import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type { SwapErrorRight, SwapperDeps, TradeCommon, TradeStepCommon } from '../../../types'
import { SwapperName } from '../../../types'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { ZrxFees, ZrxPriceResponse, ZrxTradeQuoteInput, ZrxTradeRateInput } from '../types'
import {
  calculateBuyAmountBeforeFeesCryptoBaseUnit,
  calculateRate,
  getProtocolFees,
  isWrappedNativeSell,
} from './helpers'

type NormalizedZrxQuote = {
  buyAmount: string
  sellAmount: string
  fees: ZrxFees
  route: ZrxPriceResponse['route']
}

type ZrxTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: ReturnType<typeof getProtocolFees>
  stepDataArgs: { deps: SwapperDeps; sellAsset: Asset }
}

export const getZrxTradeContext = ({
  input,
  deps,
  slippageTolerancePercentageDecimal,
  normalizedQuote,
}: {
  input: ZrxTradeQuoteInput | ZrxTradeRateInput
  deps: SwapperDeps
  slippageTolerancePercentageDecimal: string
  normalizedQuote: NormalizedZrxQuote
}): Result<ZrxTradeContext, SwapErrorRight> => {
  const { assetsById } = deps
  const { sellAsset, buyAsset, affiliateBps, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input
  const { buyAmount, sellAmount, fees, route } = normalizedQuote

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const maybeBuyAmountBeforeFeesCryptoBaseUnit = calculateBuyAmountBeforeFeesCryptoBaseUnit({
    buyAmount,
    fees,
    buyAsset,
    sellAsset,
  })

  if (maybeBuyAmountBeforeFeesCryptoBaseUnit.isErr())
    return Err(maybeBuyAmountBeforeFeesCryptoBaseUnit.unwrapErr())

  // Native and fully wrapped-native sells need no Permit2 approval
  const allowanceContract =
    isNativeEvmAsset(sellAsset.assetId) || isWrappedNativeSell(route) ? '' : PERMIT2_CONTRACT

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Zrx,
      affiliateBps,
      // Slippage protection is always enabled for 0x api v2 unlike api v1 which was only supported on specific pairs.
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      // Assume instant execution since this is a same-chain AMM Tx which will happen within the same block
      estimatedExecutionTimeMs: 0,
      allowanceContract,
      rate,
      buyAsset,
      sellAsset,
      buyAmountBeforeFeesCryptoBaseUnit: maybeBuyAmountBeforeFeesCryptoBaseUnit.unwrap(),
      buyAmountAfterFeesCryptoBaseUnit: buyAmount,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      source: SwapperName.Zrx,
      affiliateFee: buildAffiliateFee({
        strategy: 'buy_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmount,
      }),
    },
    protocolFees: getProtocolFees({ fees, sellAsset, assetsById }),
    stepDataArgs: { deps, sellAsset },
  })
}
