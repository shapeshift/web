import type { GasCost } from '@lifi/sdk'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getAssetAddress/getAssetAddress'

const processNetworkFee = ({
  allRouteGasCosts,
  feeAsset,
}: {
  allRouteGasCosts: GasCost[]
  feeAsset: Asset
}) => {
  const feeAssetAddress = getEvmAssetAddress(feeAsset)

  const networkFeeCryptoLifiPrecision = allRouteGasCosts
    .filter(gasCost => gasCost.token.address === feeAssetAddress)
    .reduce((acc, gasCost) => acc.plus(bnOrZero(gasCost.amount)), bn(0))

  return networkFeeCryptoLifiPrecision
}

const getOtherGasCosts = ({
  allRouteGasCosts,
  feeAsset,
}: {
  allRouteGasCosts: GasCost[]
  feeAsset: Asset
}) => {
  const feeAssetAddress = getEvmAssetAddress(feeAsset)

  const nonFeeAssetGasCosts = allRouteGasCosts.filter(
    gasCost => gasCost.token.address !== feeAssetAddress,
  )

  return nonFeeAssetGasCosts
}

// In cases where gas costs are denominated in tokens other than `feeAsset`, gas is better thought of as
// a protocol fee rather than a network fee (gas) due the way our UI assumes gas is always `feeAsset`
// To handle this the following is done:
// 1. add all gas costs denominated in `feeAsset` to `networkFeeCryptoBaseUnit`
// 2. add all other gas costs to `sellAssetTradeFeeUsd`
export const processGasCosts = ({
  allRouteGasCosts,
  feeAsset,
}: {
  allRouteGasCosts: GasCost[]
  feeAsset: Asset
}) => {
  return {
    networkFeeCryptoBaseUnit: processNetworkFee({
      allRouteGasCosts,
      feeAsset,
    }),
    otherGasCosts: getOtherGasCosts({
      allRouteGasCosts,
      feeAsset,
    }),
  }
}
