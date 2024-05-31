import type { Token } from '@lifi/sdk'
import type { LifiStep } from '@lifi/types'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ProtocolFee } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'

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
    throw Error("chainId isn't an EVM ChainId", {
      cause: { chainId },
    })
  }

  // aggregate fee costs by asset id and whether they are included or not
  const feeCosts = (lifiStep.estimate.feeCosts ?? []).reduce<
    Record<AssetId, { token: Token; included: bigint; notIncluded: bigint }>
  >((acc, feeCost) => {
    const { amount, token, included } = feeCost
    const assetId = lifiTokenToAssetId(token)

    if (!acc[assetId]) {
      acc[assetId] = {
        token,
        included: BigInt(0),
        notIncluded: BigInt(0),
      }
    }

    included
      ? (acc[assetId].included += BigInt(amount))
      : (acc[assetId].notIncluded += BigInt(amount))

    return acc
  }, {})

  const protocolFees = Object.entries(feeCosts).reduce<Record<AssetId, ProtocolFee>>(
    (acc, [assetId, feeCost]) => {
      const { included, notIncluded, token } = feeCost
      const asset = assets[assetId]

      const { amountCryptoBaseUnit, requiresBalance } = (() => {
        // prioritize protocol fees that require balance to ensure the necessary balance checks are performed downstream
        if (notIncluded > 0n) {
          return { amountCryptoBaseUnit: notIncluded.toString(), requiresBalance: true }
        }
        return { amountCryptoBaseUnit: included.toString(), requiresBalance: false }
      })()

      acc[assetId] = {
        amountCryptoBaseUnit,
        asset: {
          chainId: asset?.chainId ?? lifiChainIdToChainId(token.chainId),
          precision: asset?.precision ?? token.decimals,
          symbol: asset?.symbol ?? token.symbol,
          ...asset,
        },
        requiresBalance,
      }

      return acc
    },
    {} as Record<AssetId, ProtocolFee>,
  )

  return protocolFees
}
