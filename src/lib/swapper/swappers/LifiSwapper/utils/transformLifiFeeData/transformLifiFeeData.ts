import type { Route } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { baseUnitToHuman, baseUnitToPrecision, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getAssetAddress/getAssetAddress'
import { getFeeAssets } from 'lib/swapper/swappers/LifiSwapper/utils/getFeeAssets/getFeeAssets'
import { processGasCosts } from 'lib/swapper/swappers/LifiSwapper/utils/processGasCosts/processGasCosts'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'

export const transformLifiFeeData = async ({
  buyAsset,
  chainId,
  selectedRoute,
}: {
  buyAsset: Asset
  chainId: ChainId
  selectedRoute: Route
}): Promise<QuoteFeeData<EvmChainId>> => {
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

  const chainAdapterManager = getChainAdapterManager()
  // We guard against !isEvmChainId(chainId) above, so this cast is safe
  const adapter = chainAdapterManager.get(chainId) as unknown as EvmBaseAdapter<EvmChainId>

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
