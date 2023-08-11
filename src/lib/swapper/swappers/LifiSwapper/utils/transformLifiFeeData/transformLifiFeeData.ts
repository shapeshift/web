import type { LifiStep } from '@lifi/types'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Asset } from 'lib/asset-service'
import { bn } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'

import { lifiChainIdToChainId } from '../lifiChainIdtoChainId/lifiChainIdToChainId'
import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'

export const transformLifiStepFeeData = ({
  chainId,
  lifiStep,
  assets,
}: {
  chainId: ChainId
  lifiStep: LifiStep
  assets: Partial<Record<AssetId, Asset>>
}): Record<AssetId, ProtocolFee> => {
  if (!isEvmChainId(chainId)) {
    throw new SwapError("[transformLifiFeeData] - chainId isn't an EVM ChainId", {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: { chainId },
    })
  }

  // filter out included fees
  const allPayableFeeCosts = (lifiStep.estimate.feeCosts ?? []).filter(
    feeCost => !(feeCost as { included?: boolean }).included,
  )

  const protocolFees = allPayableFeeCosts.reduce<Record<AssetId, ProtocolFee>>((acc, feeCost) => {
    const { amount: amountCryptoBaseUnit, token } = feeCost
    const assetId = lifiTokenToAssetId(token)
    const asset = assets[assetId]
    if (!acc[assetId]) {
      acc[assetId] = {
        amountCryptoBaseUnit,
        asset: {
          chainId: asset?.chainId ?? lifiChainIdToChainId(token.chainId),
          precision: asset?.precision ?? token.decimals,
          symbol: asset?.symbol ?? token.symbol,
          ...asset,
        },
        requiresBalance: true,
      }
    } else {
      acc[assetId].amountCryptoBaseUnit = bn(acc[assetId].amountCryptoBaseUnit)
        .plus(amountCryptoBaseUnit)
        .toString()
    }
    return acc
  }, {} as Record<AssetId, ProtocolFee>)

  return protocolFees
}
