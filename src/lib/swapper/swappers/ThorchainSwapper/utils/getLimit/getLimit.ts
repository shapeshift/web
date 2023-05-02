import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import max from 'lodash/max'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThorchainSwapperDeps } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import {
  getTradeRate,
  getTradeRateBelowMinimum,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/getTradeRate/getTradeRate'
import { getUsdRate } from 'lib/swapper/swappers/ThorchainSwapper/utils/getUsdRate/getUsdRate'
import { isRune } from 'lib/swapper/swappers/ThorchainSwapper/utils/isRune/isRune'
import { ALLOWABLE_MARKET_MOVEMENT } from 'lib/swapper/swappers/utils/constants'

export type GetLimitArgs = {
  receiveAddress: string
  buyAssetId: string
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  deps: ThorchainSwapperDeps
  slippageTolerance: string
  buyAssetTradeFeeUsd: string
  affiliateBps: string
}

export const getLimit = async ({
  sellAsset,
  buyAssetId,
  receiveAddress,
  sellAmountCryptoBaseUnit,
  deps,
  slippageTolerance,
  buyAssetTradeFeeUsd,
  affiliateBps,
}: GetLimitArgs): Promise<Result<string, SwapErrorRight>> => {
  const maybeTradeRate = await getTradeRate({
    sellAsset,
    buyAssetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    deps,
    affiliateBps,
  })

  const tradeRateBelowMinimum = await getTradeRateBelowMinimum({
    sellAssetId: sellAsset.assetId,
    buyAssetId,
    deps,
  })
  const maybeTradeRateOrMinimum = maybeTradeRate.match({
    ok: tradeRate => Ok(tradeRate),
    err: () => tradeRateBelowMinimum,
  })

  // This should not happen but it may - we should be able to get either a trade rate, or a minimum as a default
  if (maybeTradeRateOrMinimum.isErr()) return Err(maybeTradeRateOrMinimum.unwrapErr())
  const tradeRateOrMinimum = maybeTradeRateOrMinimum.unwrap()

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

  const maybeSellFeeAssetUsdRate = await getUsdRate(deps.daemonUrl, sellAssetChainFeeAssetId)
  if (maybeSellFeeAssetUsdRate.isErr()) return Err(maybeSellFeeAssetUsdRate.unwrapErr())
  const sellFeeAssetUsdRate = maybeSellFeeAssetUsdRate.unwrap()

  const maybeBuyAssetUsdRate = await getUsdRate(deps.daemonUrl, buyAssetId)
  if (maybeBuyAssetUsdRate.isErr()) return Err(maybeBuyAssetUsdRate.unwrapErr())
  const buyAssetUsdRate = maybeBuyAssetUsdRate.unwrap()

  const expectedBuyAmountCryptoPrecision8 = toBaseUnit(
    fromBaseUnit(bnOrZero(sellAmountCryptoBaseUnit).times(tradeRateOrMinimum), sellAsset.precision),
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

  const maybeRefundFeeBuyAssetCryptoPrecision8: Result<string, SwapErrorRight> = (() => {
    switch (true) {
      // If the sell asset is on THOR the return fee is fixed at 0.02 RUNE
      case isRune(sellAsset.assetId): {
        const runeFeeUsd = RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN.times(sellFeeAssetUsdRate)
        return Ok(toBaseUnit(bnOrZero(runeFeeUsd).div(buyAssetUsdRate), THORCHAIN_FIXED_PRECISION))
      }
      // Else the return fee is the outbound fee of the sell asset's chain
      default: {
        return sellAssetAddressData.andThen(sellAssetAddressData => {
          const sellAssetTradeFeeCryptoHuman = fromBaseUnit(
            bnOrZero(sellAssetAddressData.outbound_fee),
            THORCHAIN_FIXED_PRECISION,
          )
          const sellAssetTradeFeeUsd = bnOrZero(sellAssetTradeFeeCryptoHuman).times(
            sellFeeAssetUsdRate,
          )
          return Ok(
            toBaseUnit(
              bnOrZero(sellAssetTradeFeeUsd).div(buyAssetUsdRate),
              THORCHAIN_FIXED_PRECISION,
            ),
          )
        })
      }
    }
  })()

  if (maybeRefundFeeBuyAssetCryptoPrecision8.isErr())
    return Err(maybeRefundFeeBuyAssetCryptoPrecision8.unwrapErr())
  const refundFeeBuyAssetCryptoPrecision8 = maybeRefundFeeBuyAssetCryptoPrecision8.unwrap()

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
