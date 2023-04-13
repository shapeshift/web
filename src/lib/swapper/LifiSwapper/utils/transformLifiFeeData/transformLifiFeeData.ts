import type { Route, Token } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { QuoteFeeData } from '@shapeshiftoss/swapper'
import { APPROVAL_GAS_LIMIT } from '@shapeshiftoss/swapper/dist/swappers/utils/constants'
import { baseUnitToHuman, baseUnitToPrecision, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getEvmChainAdapter } from 'lib/swapper/LifiSwapper/utils/getEvmChainAdapter'
import { getFeeAssets } from 'lib/swapper/LifiSwapper/utils/getFeeAssets/getFeeAssets'
import { processGasCosts } from 'lib/swapper/LifiSwapper/utils/processGasCosts/processGasCosts'

export const transformLifiFeeData = async ({
  buyLifiToken,
  chainId,
  lifiAssetMap,
  selectedRoute,
}: {
  buyLifiToken: Token
  chainId: ChainId
  lifiAssetMap: Map<AssetId, Token>
  selectedRoute: Route
}): Promise<QuoteFeeData<EvmChainId>> => {
  const allRouteGasCosts = selectedRoute.steps.flatMap(step => step.estimate.gasCosts ?? [])
  const allRouteFeeCosts = selectedRoute.steps.flatMap(step => step.estimate.feeCosts ?? [])

  const buyAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address === buyLifiToken.address,
  )

  // all fees that are not the buy asset (there may be multiple different tokens)
  const sellAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address !== buyLifiToken.address,
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

  const { feeAsset, lifiFeeAsset } = getFeeAssets(chainId, lifiAssetMap)

  const { networkFeeCryptoBaseUnit, sellAssetTradeFeeUsd } = processGasCosts({
    feeAsset,
    lifiFeeAsset,
    allRouteGasCosts,
    initialSellAssetTradeFeeUsd,
  })

  const adapter = getEvmChainAdapter(chainId)
  const gasFeeData = await adapter.getGasFeeData()
  const gasPriceCryptoBaseUnit = gasFeeData.fast.gasPrice
  const approvalFeeCryptoBaseUnit = bn(APPROVAL_GAS_LIMIT).times(gasPriceCryptoBaseUnit).toString()

  return {
    networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(), // UI shows this next to the gas icon
    chainSpecific: {
      gasPriceCryptoBaseUnit,
      approvalFeeCryptoBaseUnit, // the total gas for the erc20 interaction approval tx - this appears to be redundant
      // TODO: add gasPriceCryptoBaseUnit so approvals are not displayed as 0
      // gasPriceCryptoBaseUnit: gas price for approval

      // lifi handles approval gas internally but need to set a gas limit so the
      // approval limit isnt exceeded when the trade is executed.
      estimatedGasCryptoBaseUnit: APPROVAL_GAS_LIMIT,
    },
    // UI shows the sum of these as "protocol fee"
    buyAssetTradeFeeUsd: buyAssetTradeFeeUsd.toString(),
    sellAssetTradeFeeUsd: sellAssetTradeFeeUsd.toString(),
  }
}
