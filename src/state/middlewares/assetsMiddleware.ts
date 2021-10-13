import { AssetService } from '@shapeshiftoss/asset-service'
import { Asset, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { assets } from 'state/slices/assetsSlice/assetsSlice'

export const assetMiddleware = (store: any) => {
  const service = new AssetService('')

  const fetchAsset = async ({
    tokenId,
    chain,
    network
  }: {
    tokenId?: string
    chain: ChainTypes
    network: NetworkTypes
  }) => {
    if (!service.isInitialized) await service.initialize()
    const assetData: Asset | undefined = service?.byTokenId({ chain, network, tokenId })
    const description = await service?.description(chain, tokenId)
    return { ...assetData, description }
  }

  return (next: any) => (action: any) => {
    switch (action.type) {
      case 'asset/fetch':
        fetchAsset(action.payload).then(asset =>
          store.dispatch(assets.actions.resolvedFetch(asset))
        )
        break
      default:
        next(action)
    }
  }
}
