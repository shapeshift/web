import type { RoutesResponse } from '@lifi/sdk'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { QuoteFeeData } from '@shapeshiftoss/swapper'
import { bn, bnOrZero, fromHuman, toHuman } from 'lib/bignumber/bignumber'
import { LIFI_GAS_FEE_BASE } from 'lib/swapper/LifiSwapper/utils/constants'

// NOTE: fees are denoted in the sell asset
export const transformLifiFeeData = (
  lifiRoutesResponse: RoutesResponse,
  selectedRouteIndex: number,
  buyAssetAddress: string,
  sellAssetAddress: string,
): QuoteFeeData<EvmChainId> => {
  const selectedRoute = lifiRoutesResponse.routes[selectedRouteIndex]
  const allRouteGasCosts = selectedRoute.steps.flatMap(step => step.estimate.gasCosts ?? [])
  const allRouteFeeCosts = selectedRoute.steps.flatMap(step => step.estimate.feeCosts ?? [])

  const buyAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address === buyAssetAddress,
  )
  const sellAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address === sellAssetAddress,
  )

  // this is the sum of all `feeCosts` against the buy asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const buyAssetTradeFeeUsd =
    buyAssetRouteFeeCosts
      .map(feeCost =>
        toHuman({ value: feeCost.amount, inputPrecision: feeCost.token.decimals }).multipliedBy(
          bnOrZero(feeCost.token.priceUSD),
        ),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  // this is the sum of all `feeCosts` against the sell asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const sellAssetTradeFeeUsd =
    sellAssetRouteFeeCosts
      .map(feeCost =>
        toHuman({ value: feeCost.amount, inputPrecision: feeCost.token.decimals }).multipliedBy(
          bnOrZero(feeCost.token.priceUSD),
        ),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  const networkFeeCryptoBaseUnit = fromHuman({
    value: selectedRoute.gasCostUSD ?? '0',
    outputPrecision: selectedRoute.fromToken.decimals,
  }).dividedBy(bnOrZero(selectedRoute.fromToken.priceUSD))

  // the sum of all 'APPROVE' gas fees
  // TODO: validate this with lifi
  const approvalFeeCryptoBaseUnit =
    allRouteGasCosts
      .filter(gasCost => gasCost.type === 'APPROVE')
      .reduce((a, v) => (v.estimate ? a.plus(bn(v.estimate, LIFI_GAS_FEE_BASE)) : a), bn(0)) ??
    bn(0)

  return {
    networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(), // UI shows this as $4.59 next to the gas icon
    chainSpecific: {
      // the following are not required because gas is hardcoded downstream during approval
      // estimatedGas: gas limit for approval
      // gasPriceCryptoBaseUnit: gas price for approval
      approvalFeeCryptoBaseUnit: approvalFeeCryptoBaseUnit.toString(),
    },
    buyAssetTradeFeeUsd: buyAssetTradeFeeUsd.toString(), // UI shows as "protocol fee"
    sellAssetTradeFeeUsd: sellAssetTradeFeeUsd.toString(),
  }
}
