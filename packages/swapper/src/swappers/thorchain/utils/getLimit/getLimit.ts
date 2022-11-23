import { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import max from 'lodash/max'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero, fromBaseUnit, toBaseUnit } from '../../../utils/bignumber'
import { RUNE_OUTBOUND_TRANSACTION_FEE_CRYPTO_HUMAN } from '../../constants'
import { ThorchainSwapperDeps } from '../../types'
import { THORCHAIN_FIXED_PRECISION } from '../constants'
import { getInboundAddressDataForChain } from '../getInboundAddressDataForChain'
import { getTradeRate } from '../getTradeRate/getTradeRate'
import { getUsdRate } from '../getUsdRate/getUsdRate'
import { isRune } from '../isRune/isRune'

export type GetLimitArgs = {
  buyAssetId: string
  sellAsset: Asset
  sellAmountCryptoPrecision: string
  deps: ThorchainSwapperDeps
  slippageTolerance: string
  buyAssetTradeFeeUsd: string
}

export const getLimit = async ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoPrecision,
  deps,
  slippageTolerance,
  buyAssetTradeFeeUsd,
}: GetLimitArgs): Promise<string> => {
  const tradeRate = await getTradeRate(sellAsset, buyAssetId, sellAmountCryptoPrecision, deps)
  const sellAssetChainFeeAssetId = deps.adapterManager.get(sellAsset.chainId)?.getFeeAssetId()
  const buyAssetChainFeeAssetId = deps.adapterManager
    .get(fromAssetId(buyAssetId).chainId)
    ?.getFeeAssetId()
  if (!sellAssetChainFeeAssetId || !buyAssetChainFeeAssetId) {
    throw new SwapError('[getLimit]: no sellAssetChainFeeAsset or buyAssetChainFeeAssetId', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      details: { sellAssetChainFeeAssetId, buyAssetChainFeeAssetId },
    })
  }

  const sellFeeAssetUsdRate = await getUsdRate(deps.daemonUrl, sellAssetChainFeeAssetId)
  const buyAssetUsdRate = await getUsdRate(deps.daemonUrl, buyAssetId)
  const expectedBuyAmountCryptoPrecision8 = toBaseUnit(
    fromBaseUnit(bnOrZero(sellAmountCryptoPrecision).times(tradeRate), sellAsset.precision),
    THORCHAIN_FIXED_PRECISION,
  )

  const isValidSlippageRange =
    bnOrZero(slippageTolerance).gte(0) && bnOrZero(slippageTolerance).lte(1)
  if (bnOrZero(expectedBuyAmountCryptoPrecision8).lt(0) || !isValidSlippageRange)
    throw new SwapError('[getLimit]: bad expected buy amount or bad slippage tolerance', {
      code: SwapErrorTypes.BUILD_TRADE_FAILED,
      details: { expectedBuyAmountCryptoPrecision8, slippageTolerance },
    })

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
    .minus(highestPossibleFeeCryptoPrecision8 ?? 0)
    .decimalPlaces(0)

  // expectedBuyAmountAfterHighestFeeCryptoPrecision8 can be negative if the sell asset has a higher inbound_fee
  // (a refund) than the buy asset's inbound_fee + buy amount.
  // I.e. we've come this far - we don't have enough to refund, so the limit can slide all the way to 0.
  return expectedBuyAmountAfterHighestFeeCryptoPrecision8.isPositive()
    ? expectedBuyAmountAfterHighestFeeCryptoPrecision8.toString()
    : '0'
}
