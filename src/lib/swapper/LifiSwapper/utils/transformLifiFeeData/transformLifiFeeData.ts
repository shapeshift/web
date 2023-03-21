import type { Route, Token } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { QuoteFeeData } from '@shapeshiftoss/swapper'
import { bn, bnOrZero, toHuman } from 'lib/bignumber/bignumber'
import { LIFI_GAS_FEE_BASE } from 'lib/swapper/LifiSwapper/utils/constants'
import { getFeeAssets } from 'lib/swapper/LifiSwapper/utils/getFeeAssets/getFeeAssets'
import { processGasCosts } from 'lib/swapper/LifiSwapper/utils/processGasCosts/processGasCosts'

export const transformLifiFeeData = ({
  buyAssetAddress,
  chainId,
  lifiAssetMap,
  selectedRoute,
}: {
  buyAssetAddress: string
  chainId: ChainId
  lifiAssetMap: Map<AssetId, Token>
  selectedRoute: Route
}): QuoteFeeData<EvmChainId> => {
  const allRouteGasCosts = selectedRoute.steps.flatMap(step => step.estimate.gasCosts ?? [])
  const allRouteFeeCosts = selectedRoute.steps.flatMap(step => step.estimate.feeCosts ?? [])

  const buyAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address === buyAssetAddress,
  )

  // all fees that are not the buy asset (there may be multiple different tokens)
  const sellAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address !== buyAssetAddress,
  )

  // this is the sum of all `feeCost` against the buy asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const buyAssetTradeFeeUsd =
    buyAssetRouteFeeCosts
      .map(feeCost =>
        toHuman({ value: feeCost.amount, inputPrecision: feeCost.token.decimals }).multipliedBy(
          bnOrZero(feeCost.token.priceUSD),
        ),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  // this is the sum of all `feeCost` against the sell asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const initialSellAssetTradeFeeUsd =
    sellAssetRouteFeeCosts
      .map(feeCost =>
        toHuman({ value: feeCost.amount, inputPrecision: feeCost.token.decimals }).multipliedBy(
          bnOrZero(feeCost.token.priceUSD),
        ),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  const { feeAsset, lifiFeeAsset } = getFeeAssets(chainId, lifiAssetMap)

  const { networkFeeCryptoBaseUnit, sellAssetTradeFeeUsd } = processGasCosts({
    feeAsset,
    lifiFeeAsset,
    allRouteGasCosts,
    initialSellAssetTradeFeeUsd,
  })

  // the sum of all 'APPROVE' gas fees
  // TODO: validate this with lifi
  const approvalFeeCryptoBaseUnit =
    allRouteGasCosts
      .filter(gasCost => gasCost.type === 'APPROVE')
      .reduce((a, v) => (v.estimate ? a.plus(bn(v.estimate, LIFI_GAS_FEE_BASE)) : a), bn(0)) ??
    bn(0)

  return {
    networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(), // UI shows this next to the gas icon
    chainSpecific: {
      // the following are not required because gas is hardcoded downstream during approval
      // estimatedGas: gas limit for approval
      // gasPriceCryptoBaseUnit: gas price for approval
      approvalFeeCryptoBaseUnit: approvalFeeCryptoBaseUnit.toString(),
    },
    // UI shows the sum of these as "protocol fee"
    buyAssetTradeFeeUsd: buyAssetTradeFeeUsd.toString(),
    sellAssetTradeFeeUsd: sellAssetTradeFeeUsd.toString(),
  }
}
