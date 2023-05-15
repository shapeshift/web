import type { Route } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from 'lib/asset-service'
import { baseUnitToHuman, baseUnitToPrecision, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getAssetAddress/getAssetAddress'
import { getFeeAssets } from 'lib/swapper/swappers/LifiSwapper/utils/getFeeAssets/getFeeAssets'
import { processGasCosts } from 'lib/swapper/swappers/LifiSwapper/utils/processGasCosts/processGasCosts'

export const transformLifiFeeData = ({
  buyAsset,
  chainId,
  selectedRoute,
}: {
  buyAsset: Asset
  chainId: ChainId
  selectedRoute: Route
}): QuoteFeeData<EvmChainId> => {
  if (!isEvmChainId(chainId)) {
    throw new SwapError("[transformLifiFeeData] - chainId isn't an EVM ChainId", {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: { chainId },
    })
  }

  const allRouteGasCosts = selectedRoute.steps.flatMap(step => step.estimate.gasCosts ?? [])
  const allRouteFeeCosts = selectedRoute.steps.flatMap(step => step.estimate.feeCosts ?? [])

  const buyAssetAddress = getEvmAssetAddress(buyAsset)

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
        baseUnitToHuman({
          value: feeCost.amount,
          inputExponent: feeCost.token.decimals,
        }).multipliedBy(bnOrZero(feeCost.token.priceUSD)),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  // this is the sum of all `feeCost` against the sell asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const initialSellAssetTradeFeeUsd =
    sellAssetRouteFeeCosts
      .map(feeCost =>
        baseUnitToPrecision({
          value: feeCost.amount,
          inputExponent: feeCost.token.decimals,
        }).multipliedBy(bnOrZero(feeCost.token.priceUSD)),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  const feeAsset = getFeeAssets(chainId)

  const { networkFeeCryptoBaseUnit, sellAssetTradeFeeUsd } = processGasCosts({
    feeAsset,
    allRouteGasCosts,
    initialSellAssetTradeFeeUsd,
  })

  return {
    networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(),
    buyAssetTradeFeeUsd: buyAssetTradeFeeUsd.toString(),
    sellAssetTradeFeeUsd: sellAssetTradeFeeUsd.toString(),
  }
}
