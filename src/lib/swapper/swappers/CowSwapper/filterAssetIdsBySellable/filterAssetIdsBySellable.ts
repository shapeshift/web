import type { AssetId } from '@shapeshiftoss/caip'
import { selectAssets } from 'state/slices/selectors'
import { store } from 'state/store'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { COWSWAP_UNSUPPORTED_ASSETS } from '../utils/blacklist'
import { getSupportedChainIds } from '../utils/helpers/helpers'

export const filterAssetIdsBySellable = (nonNftAssetIds: AssetId[]): AssetId[] => {
  const supportedChainIds = getSupportedChainIds()
  const assets = selectAssets(store.getState())
  return nonNftAssetIds.filter(id => {
    const asset = assets[id]
    if (!asset) return false

    return (
      supportedChainIds.includes(asset.chainId) &&
      !COWSWAP_UNSUPPORTED_ASSETS.includes(id) &&
      !isNativeEvmAsset(id)
    )
  })
}
