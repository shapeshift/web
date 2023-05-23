import type { Route } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from 'lib/asset-service'
import { bn } from 'lib/bignumber/bignumber'
import type { ProtocolFee, QuoteFeeData } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getFeeAssets } from 'lib/swapper/swappers/LifiSwapper/utils/getFeeAssets/getFeeAssets'
import { processGasCosts } from 'lib/swapper/swappers/LifiSwapper/utils/processGasCosts/processGasCosts'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { lifiChainIdToChainId } from '../lifiChainIdtoChainId/lifiChainIdToChainId'
import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'

export const transformLifiFeeData = ({
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
  const allRouteFeeCosts = selectedRoute.steps
    .flatMap(step => step.estimate.feeCosts ?? [])
    .filter(feeCost => !(feeCost as { included?: boolean }).included) // filter out included fees

  const feeAsset = getFeeAssets(chainId)

  const { networkFeeCryptoBaseUnit, otherGasCosts } = processGasCosts({
    feeAsset,
    allRouteGasCosts,
  })

  const assets = selectAssets(store.getState())

  // TEMP: jumble in gas costs not denominated in the sell chain fee asset with protocol fees
  // until our UI can convey the concept of gas fees denominated in multiple tokens
  const protocolFees = [...allRouteFeeCosts, ...otherGasCosts].reduce<Record<AssetId, ProtocolFee>>(
    (acc, feeCost) => {
      const { amount, token } = feeCost
      const assetId = lifiTokenToAssetId(token)
      const asset = assets[assetId]
      if (acc[assetId] === undefined) {
        acc[assetId] = {
          amountCryptoBaseUnit: amount,
          asset: {
            chainId: asset?.chainId ?? lifiChainIdToChainId(token.chainId),
            precision: asset?.precision ?? token.decimals,
            symbol: asset?.symbol ?? token.symbol,
          },
          requiresBalance: true,
        }
      } else {
        acc[assetId].amountCryptoBaseUnit = bn(acc[assetId].amountCryptoBaseUnit)
          .plus(amount)
          .toString()
      }
      return acc
    },
    {} as Record<AssetId, ProtocolFee>,
  )

  return {
    networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(),
    protocolFees,
  }
}
