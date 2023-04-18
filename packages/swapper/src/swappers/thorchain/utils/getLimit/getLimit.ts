import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import max from 'lodash/max'

import type { SwapErrorRight } from '../../../../api'
import { makeSwapErrorRight, SwapErrorType } from '../../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../utils/bignumber'
import { ALLOWABLE_MARKET_MOVEMENT } from '../../../utils/constants'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from '../../constants'
import type { ThorchainSwapperDeps } from '../../types'
import { THORCHAIN_FIXED_PRECISION } from '../constants'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getTradeRate } from '../getTradeRate/getTradeRate'
import { getUsdRate } from '../getUsdRate/getUsdRate'
import { isRune } from '../isRune/isRune'

export type GetLimitArgs = {
  receiveAddress: string
  buyAssetId: string
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  deps: ThorchainSwapperDeps
  slippageTolerance: string
  buyAssetTradeFeeUsd: string
}

export const getLimit = async ({
  sellAsset,
  buyAssetId,
  receiveAddress,
  sellAmountCryptoBaseUnit,
  deps,
  slippageTolerance,
  buyAssetTradeFeeUsd,
}: GetLimitArgs): Promise<Result<string, SwapErrorRight>> => {
  const maybeTradeRate = await getTradeRate({
    sellAsset,
    buyAssetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    deps,
  })

  // Bubble up the Err monad if we can't get a trade rate
  if (maybeTradeRate.isErr()) {
    return Err(maybeTradeRate.unwrapErr())
  }

  const tradeRate = maybeTradeRate.unwrap()
  const sellAssetChainFeeAssetId = deps.adapterManager.get(sellAsset.chainId)?.getFeeAssetId()
  const buyAssetChainFeeAssetId = deps.adapterManager
    .get(fromAssetId(buyAssetId).chainId)
    ?.getFeeAssetId()
  if (!sellAssetChainFeeAssetId || !buyAssetChainFeeAssetId) {
    return Err(
      makeSwapErrorRight({
        message: '[getLimit]: no sellAssetChainFeeAsset or buyAssetChainFeeAssetId',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { sellAssetChainFeeAssetId, buyAssetChainFeeAssetId },
      }),
    )
  }

  const sellFeeAssetUsdRate = await getUsdRate(deps.daemonUrl, sellAssetChainFeeAssetId)
  const buyAssetUsdRate = await getUsdRate(deps.daemonUrl, buyAssetId)
  const expectedBuyAmountCryptoPrecision8 = toBaseUnit(
    fromBaseUnit(bnOrZero(sellAmountCryptoBaseUnit).times(tradeRate), sellAsset.precision),
    THORCHAIN_FIXED_PRECISION,
  )

  const isValidSlippageRange =
    bnOrZero(slippageTolerance).gte(0) && bnOrZero(slippageTolerance).lte(1)
  if (bnOrZero(expectedBuyAmountCryptoPrecision8).lt(0) || !isValidSlippageRange)
    return Err(
      makeSwapErrorRight({
        message: '[getLimit]: bad expected buy amount or bad slippage tolerance',
        code: SwapErrorType.BUILD_TRADE_FAILED,
        details: { expectedBuyAmountCryptoPrecision8, slippageTolerance },
      }),
    )

  const buyAssetTradeFeeCryptoPrecision8 = toBaseUnit(
    bnOrZero(buyAssetTradeFeeUsd).div(buyAssetUsdRate),
    THORCHAIN_FIXED_PRECISION,
  )

  const sellAssetAddressData = await getInboundAddressDataForChain(
    deps.daemonUrl,
    sellAsset.assetId,
  )

  const refundFeeBuyAssetCryptoPrecision8 = (() => {
    switch (true) {
      // If the sell asset is on THOR the return fee is fixed at 0.02 RUNE
      case isRune(sellAsset.assetId): {
        const runeFeeUsd = RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN.times(sellFeeAssetUsdRate)
        return toBaseUnit(bnOrZero(runeFeeUsd).div(buyAssetUsdRate), THORCHAIN_FIXED_PRECISION)
      }
      // Else the return fee is the outbound fee of the sell asset's chain
      default: {
        const sellAssetTradeFeeCryptoHuman = fromBaseUnit(
          bnOrZero(sellAssetAddressData?.outbound_fee),
          THORCHAIN_FIXED_PRECISION,
        )
        const sellAssetTradeFeeUsd = bnOrZero(sellAssetTradeFeeCryptoHuman).times(
          sellFeeAssetUsdRate,
        )
        return toBaseUnit(
          bnOrZero(sellAssetTradeFeeUsd).div(buyAssetUsdRate),
          THORCHAIN_FIXED_PRECISION,
        )
      }
    }
  })()

  const highestPossibleFeeCryptoPrecision8 = max([
    // both fees are denominated in buy asset crypto precision 8
    bnOrZero(buyAssetTradeFeeCryptoPrecision8).toNumber(),
    bnOrZero(refundFeeBuyAssetCryptoPrecision8).toNumber(),
  ])

  const expectedBuyAmountAfterHighestFeeCryptoPrecision8 = bnOrZero(
    expectedBuyAmountCryptoPrecision8,
  )
    .times(bn(1).minus(slippageTolerance))
    .times(bn(1).minus(ALLOWABLE_MARKET_MOVEMENT))
    .minus(highestPossibleFeeCryptoPrecision8 ?? 0)
    .decimalPlaces(0)

  // expectedBuyAmountAfterHighestFeeCryptoPrecision8 can be negative if the sell asset has a higher inbound_fee
  // (a refund) than the buy asset's inbound_fee + buy amount.
  // I.e. we've come this far - we don't have enough to refund, so the limit can slide all the way to 0.

  return Ok(
    expectedBuyAmountAfterHighestFeeCryptoPrecision8.isPositive()
      ? expectedBuyAmountAfterHighestFeeCryptoPrecision8.toString()
      : '0',
  )
}
