import type { Token } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { store } from 'state/store'

export const getFeeAssets = (
  chainId: ChainId,
  lifiAssetMap: Map<AssetId, Token>,
): { feeAsset: Asset; lifiFeeAsset: Token } => {
  const feeAsset = selectFeeAssetByChainId(store.getState(), chainId)

  if (feeAsset === undefined) {
    throw new SwapError('[processGasCosts] a fee asset was not found', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { chainId },
    })
  }

  const lifiFeeAsset = lifiAssetMap.get(feeAsset.assetId)

  if (lifiFeeAsset === undefined) {
    throw new SwapError('[processGasCosts] the fee asset does not exist in lifi', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { feeAsset },
    })
  }

  return { feeAsset, lifiFeeAsset }
}
