import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

export const getCompositeAssetSymbol = (assetId: AssetId) => {
  const asset = selectAssetById(store.getState(), assetId ?? '')
  const { chainId } = fromAssetId(assetId)
  const networkName = getChainAdapterManager().get(chainId)?.getDisplayName()
  return `${networkName}.${asset?.symbol}`
}
