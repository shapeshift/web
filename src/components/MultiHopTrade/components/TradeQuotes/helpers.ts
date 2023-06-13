import type { AssetId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapperName, TradeQuote } from 'lib/swapper/api'
import {
  selectBuyAsset,
  selectBuyAssetUsdRate,
  selectCryptoMarketData,
  selectFeeAssetById,
  selectMarketDataByFilter,
} from 'state/slices/selectors'
import { store } from 'state/store'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
  sumProtocolFeesToDenom,
} from 'state/zustand/swapperStore/utils'

/**
 * Computes the total receive amount across all hops after protocol fees are deducted
 * @param param0.quote The trade qutoe
 * @param param0.swapperName The swapper name
 * @returns The total receive amount across all hops in crypto precision after protocol fees are deducted
 */
export const getTotalReceiveAmountCryptoPrecision = ({
  quote,
  swapperName,
}: {
  quote: TradeQuote
  swapperName: SwapperName
}) => {
  const state = store.getState()
  const buyAsset = selectBuyAsset(state)
  const buyAssetUsdRate = selectBuyAssetUsdRate(state)
  const cryptoMarketDataById = selectCryptoMarketData(state)

  const buyAmountCryptoPrecision = fromBaseUnit(
    quote.steps[0].buyAmountBeforeFeesCryptoBaseUnit,
    quote.steps[0].buyAsset.precision,
  )
  const slippageDecimalPercentage =
    quote?.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(swapperName)

  const buyAmountAfterSlippageCryptoPrecision = subtractBasisPointAmount(
    buyAmountCryptoPrecision,
    convertDecimalPercentageToBasisPoints(slippageDecimalPercentage).toString(),
  )

  const bestTotalProtocolFeeCryptoPrecision = fromBaseUnit(
    sumProtocolFeesToDenom({
      cryptoMarketDataById,
      protocolFees: quote.steps[0].feeData.protocolFees,
      outputExponent: buyAsset.precision,
      outputAssetPriceUsd: buyAssetUsdRate,
    }),
    buyAsset.precision,
  )

  return bnOrZero(buyAmountAfterSlippageCryptoPrecision)
    .minus(bestTotalProtocolFeeCryptoPrecision)
    .toString()
}

/**
 * Computes the total network fee across all hops
 * @param quote The trade quote
 * @returns The total network fee across all hops in fiat precision
 */
export const getTotalNetworkFeeFiatPrecision = (quote: TradeQuote) =>
  quote.steps
    .reduce((acc, step) => {
      // TODO(woodenfurniture): handle osmo swapper crazy netowrk fee logic here
      const feeAsset = selectFeeAssetById(store.getState(), step.sellAsset.assetId)

      if (feeAsset === undefined)
        throw Error(`missing fee asset for assetId ${step.sellAsset.assetId}`)

      const feeAssetFiatRate = selectMarketDataByFilter(store.getState(), {
        assetId: feeAsset.assetId,
      }).price

      const networkFeeCryptoBaseUnit = step.feeData.networkFeeCryptoBaseUnit
      const networkFeeFiatPrecision = bnOrZero(
        fromBaseUnit(networkFeeCryptoBaseUnit, feeAsset.precision),
      ).times(feeAssetFiatRate)

      return acc.plus(networkFeeFiatPrecision)
    }, bn(0))
    .toString()

export const getTotalProtocolFeeForAsset = (quote: TradeQuote) =>
  quote.steps.reduce<Record<AssetId, ProtocolFee>>((acc, step) => {
    return Object.entries(step.feeData.protocolFees).reduce<Record<AssetId, ProtocolFee>>(
      (innerAcc, [assetId, protocolFee]) => {
        if (innerAcc[assetId] === undefined) {
          innerAcc[assetId] = protocolFee
          return innerAcc
        }

        innerAcc[assetId].amountCryptoBaseUnit = bn(innerAcc[assetId].amountCryptoBaseUnit)
          .plus(protocolFee.amountCryptoBaseUnit)
          .toString()
        return innerAcc
      },
      acc,
    )
  }, {})
