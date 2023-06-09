import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from 'lib/asset-service'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { store } from 'state/store'

export const getFeeAssets = (chainId: ChainId): Asset => {
  const feeAsset = selectFeeAssetByChainId(store.getState(), chainId)

  if (feeAsset === undefined) {
    throw new SwapError('[processGasCosts] a fee asset was not found', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { chainId },
    })
  }

  return feeAsset
}
