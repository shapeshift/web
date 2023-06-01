import type { Step } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { bn } from 'lib/bignumber/bignumber'
import type { ProtocolFee } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { lifiChainIdToChainId } from '../lifiChainIdtoChainId/lifiChainIdToChainId'
import { lifiTokenToAssetId } from '../lifiTokenToAssetId/lifiTokenToAssetId'

export const transformLifiStepFeeData = ({
  chainId,
  lifiStep,
}: {
  chainId: ChainId
  lifiStep: Step
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

  const assets = selectAssets(store.getState())

  const protocolFees = allPayableFeeCosts.reduce<Record<AssetId, ProtocolFee>>((acc, feeCost) => {
    const { amount: amountCryptoBaseUnit, token } = feeCost
    const assetId = lifiTokenToAssetId(token)
    const asset = assets[assetId]
    if (acc[assetId] === undefined) {
      acc[assetId] = {
        amountCryptoBaseUnit,
        asset: {
          chainId: asset?.chainId ?? lifiChainIdToChainId(token.chainId),
          precision: asset?.precision ?? token.decimals,
          symbol: asset?.symbol ?? token.symbol,
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
