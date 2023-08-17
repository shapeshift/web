import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import max from 'lodash/max'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { fromBaseUnit, toBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { THORCHAIN_FIXED_PRECISION } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { getInboundAddressDataForChain } from 'lib/swapper/swappers/ThorchainSwapper/utils/getInboundAddressDataForChain'
import {
  getTradeRate,
  getTradeRateBelowMinimum,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/getTradeRate/getTradeRate'
import { isRune } from 'lib/swapper/swappers/ThorchainSwapper/utils/isRune/isRune'
import { ALLOWABLE_MARKET_MOVEMENT } from 'lib/swapper/swappers/utils/constants'
import type { PartialRecord } from 'lib/utils'

import type { ThornodeQuoteResponseSuccess } from '../../types'

export type GetLimitArgs = {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageTolerance: string
  protocolFees: PartialRecord<AssetId, ProtocolFee>
  buyAssetUsdRate: string
  feeAssetUsdRate: string
  thornodeQuote: ThornodeQuoteResponseSuccess
}

export const getLimit = async ({
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageTolerance,
  protocolFees,
  buyAssetUsdRate,
  feeAssetUsdRate,
  thornodeQuote,
}: GetLimitArgs): Promise<Result<string, SwapErrorRight>> => {
  const maybeTradeRate = await getTradeRate({
    sellAsset,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit,
    thornodeQuote,
  })

  const tradeRateBelowMinimum = await getTradeRateBelowMinimum({
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
  })
  const maybeTradeRateOrMinimum = maybeTradeRate.match({
    ok: tradeRate => Ok(tradeRate),
    err: () => tradeRateBelowMinimum,
  })

  // This should not happen but it may - we should be able to get either a trade rate, or a minimum as a default
  if (maybeTradeRateOrMinimum.isErr()) return Err(maybeTradeRateOrMinimum.unwrapErr())
  const tradeRateOrMinimum = maybeTradeRateOrMinimum.unwrap()

  const chainAdapterManager = getChainAdapterManager()
  const sellAssetChainFeeAssetId = chainAdapterManager.get(sellAsset.chainId)?.getFeeAssetId()
  const buyAssetChainFeeAssetId = chainAdapterManager
    .get(fromAssetId(buyAsset.assetId).chainId)
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

  const buyAssetTradeFeeCryptoPrecision8 = convertPrecision({
    value: bnOrZero(protocolFees[buyAsset.assetId]?.amountCryptoBaseUnit),
    inputExponent: buyAsset.precision,
    outputExponent: THORCHAIN_FIXED_PRECISION,
  })

  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const sellAssetAddressData = await getInboundAddressDataForChain(daemonUrl, sellAsset.assetId)

  const maybeRefundFeeBuyAssetCryptoPrecision8: Result<string, SwapErrorRight> = (() => {
    switch (true) {
      // If the sell asset is on THOR the return fee is fixed at 0.02 RUNE
      case isRune(sellAsset.assetId): {
        const runeFeeUsd = RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN.times(feeAssetUsdRate)
        return Ok(toBaseUnit(bnOrZero(runeFeeUsd).div(buyAssetUsdRate), THORCHAIN_FIXED_PRECISION))
      }
      // Else the return fee is the outbound fee of the sell asset's chain
      default: {
        return sellAssetAddressData.andThen(sellAssetAddressData => {
          const sellAssetTradeFeeCryptoHuman = fromBaseUnit(
            bnOrZero(sellAssetAddressData.outbound_fee),
            THORCHAIN_FIXED_PRECISION,
          )
          const sellAssetTradeFeeUsd = bnOrZero(sellAssetTradeFeeCryptoHuman).times(feeAssetUsdRate)
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
