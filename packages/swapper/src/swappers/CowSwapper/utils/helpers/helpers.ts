import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset, OrderQuoteResponse } from '@shapeshiftoss/types'
import {
  bn,
  bnOrZero,
  convertBasisPointsToDecimalPercentage,
  convertPrecision,
  fromBaseUnit,
} from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../../types'
import { TradeQuoteError } from '../../../../types'
import { makeSwapErrorRight } from '../../../../utils'

export type CowSwapQuoteApiInputBase = {
  appData: string
  appDataHash?: string
  buyToken: string
  from: string
  kind: string
  partiallyFillable: boolean
  receiver: string
  sellToken: string
  validTo: number
}

export type CowSwapSellQuoteApiInput = CowSwapQuoteApiInputBase & {
  sellAmountBeforeFee: string
}

export const getNowPlusThirtyMinutesTimestamp = (): number => {
  const ts = new Date()
  ts.setMinutes(ts.getMinutes() + 30)
  return Math.round(ts.getTime() / 1000)
}

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
  supportedChainIds,
}: {
  buyAsset: Asset
  sellAsset: Asset
  supportedChainIds: ChainId[]
}): Result<boolean, SwapErrorRight> => {
  if (!supportedChainIds.includes(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[CowSwap: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (fromAssetId(sellAsset.assetId).assetNamespace !== 'erc20') {
    return Err(
      makeSwapErrorRight({
        message: '[CowSwap: assertValidTrade] - Sell asset must be an ERC-20',
        code: TradeQuoteError.UnsupportedTradePair,
        details: { sellAsset },
      }),
    )
  }

  return Ok(true)
}

type GetValuesFromQuoteResponseArgs = {
  buyAsset: Asset
  sellAsset: Asset
  response: OrderQuoteResponse
  affiliateBps: string
}

export const deductAffiliateFeesFromAmount = ({
  amount,
  affiliateBps,
}: {
  amount: string
  affiliateBps: string
}) => {
  const hasAffiliateFee = bnOrZero(affiliateBps).gt(0)
  if (!hasAffiliateFee) return amount

  return bn(amount)
    .times(bn(1).minus(convertBasisPointsToDecimalPercentage(affiliateBps)))
    .toFixed(0)
}

export const deductSlippageFromAmount = ({
  amount,
  slippageTolerancePercentageDecimal,
}: {
  amount: string
  slippageTolerancePercentageDecimal: string
}) => {
  return bn(amount).minus(bn(amount).times(slippageTolerancePercentageDecimal))
}

export const getValuesFromQuoteResponse = ({
  buyAsset,
  sellAsset,
  response,
  affiliateBps,
}: GetValuesFromQuoteResponseArgs) => {
  const {
    sellAmount: sellAmountAfterFeesCryptoBaseUnit,
    feeAmount: feeAmountInSellTokenCryptoBaseUnit,
    buyAmount,
  } = response.quote

  // Remove affiliate fees off the buyAmount to get the amount after affiliate fees, but before slippage bips
  const buyAmountAfterAffiliateFeesCryptoBaseUnit = deductAffiliateFeesFromAmount({
    amount: buyAmount,
    affiliateBps,
  })

  const buyAmountAfterAffiliateFeesCryptoPrecision = fromBaseUnit(
    buyAmountAfterAffiliateFeesCryptoBaseUnit,
    buyAsset.precision,
  )

  const sellAmountCryptoPrecision = fromBaseUnit(
    sellAmountAfterFeesCryptoBaseUnit,
    sellAsset.precision,
  )

  const rate = bnOrZero(buyAmountAfterAffiliateFeesCryptoPrecision)
    .div(sellAmountCryptoPrecision)
    .toString()

  const sellAmountBeforeFeesCryptoBaseUnit = bnOrZero(sellAmountAfterFeesCryptoBaseUnit)
    .plus(feeAmountInSellTokenCryptoBaseUnit)
    .toFixed()

  const buyAmountBeforeAffiliateAndProtocolFeesCryptoBaseUnit = convertPrecision({
    value: sellAmountBeforeFeesCryptoBaseUnit,
    inputExponent: sellAsset.precision,
    outputExponent: buyAsset.precision,
  })
    .times(rate)
    .toFixed(0)

  return {
    rate,
    buyAmountBeforeFeesCryptoBaseUnit: buyAmountBeforeAffiliateAndProtocolFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit: buyAmountAfterAffiliateFeesCryptoBaseUnit,
  }
}
