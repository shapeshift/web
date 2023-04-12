import type { GasCost, Token } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'

const processNetworkFee = ({
  allRouteGasCosts,
  feeAsset,
  lifiFeeAsset,
}: {
  allRouteGasCosts: GasCost[]
  feeAsset: Asset
  lifiFeeAsset: Token
}) => {
  const networkFeeCryptoLifiPrecision = allRouteGasCosts
    .filter(gasCost => gasCost.token.address === lifiFeeAsset.address)
    .reduce((acc, gasCost) => acc.plus(bnOrZero(gasCost.amount)), bn(0))

  return convertPrecision({
    value: networkFeeCryptoLifiPrecision,
    inputPrecision: lifiFeeAsset.decimals,
    outputPrecision: feeAsset.precision,
  })
}

const processTradeFee = ({
  allRouteGasCosts,
  initialSellAssetTradeFeeUsd,
  lifiFeeAsset,
}: {
  allRouteGasCosts: GasCost[]
  initialSellAssetTradeFeeUsd: BigNumber
  lifiFeeAsset: Token
}) => {
  const nonFeeAssetGasCosts = allRouteGasCosts
    .filter(gasCost => gasCost.token.address !== lifiFeeAsset?.address)
    .reduce((acc, gasCost) => acc.plus(bnOrZero(gasCost.amountUSD)), bn(0))

  return initialSellAssetTradeFeeUsd.plus(nonFeeAssetGasCosts)
}

// In cases where gas costs are denominated in tokens other than `feeAsset`, gas is better thought of as
// a protocol fee rather than a network fee (gas) due the way our UI assumes gas is always `feeAsset`
// To handle this the following is done:
// 1. add all gas costs denominated in `feeAsset` to `networkFeeCryptoBaseUnit`
// 2. add all other gas costs to `sellAssetTradeFeeUsd`
export const processGasCosts = ({
  allRouteGasCosts,
  initialSellAssetTradeFeeUsd,
  feeAsset,
  lifiFeeAsset,
}: {
  allRouteGasCosts: GasCost[]
  initialSellAssetTradeFeeUsd: BigNumber
  feeAsset: Asset
  lifiFeeAsset: Token
}) => {
  return {
    networkFeeCryptoBaseUnit: processNetworkFee({
      allRouteGasCosts,
      feeAsset,
      lifiFeeAsset,
    }),
    sellAssetTradeFeeUsd: processTradeFee({
      allRouteGasCosts,
      initialSellAssetTradeFeeUsd,
      lifiFeeAsset,
    }),
  }
}
