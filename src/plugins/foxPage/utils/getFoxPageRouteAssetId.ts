import { ethChainId, toAssetId } from '@keepkey/caip'
import { foxyAddresses } from '@keepkey/investor-foxy'
import { matchPath } from 'react-router'

const FOX_PAGE_DEFAULT_ASSET = 'fox'

export const getFoxPageRouteAssetId = (pathname: string) => {
  const foxPageAssetIdPathMatch = matchPath<{ foxAsset?: 'fox' | 'foxy' }>(pathname, {
    path: '/fox/:foxAsset?',
  })

  if (foxPageAssetIdPathMatch) {
    const foxAsset = foxPageAssetIdPathMatch?.params?.foxAsset ?? FOX_PAGE_DEFAULT_ASSET

    if (foxyAddresses[0][foxAsset]) {
      const assetReference = foxyAddresses[0][foxAsset]

      return toAssetId({
        assetReference,
        assetNamespace: 'erc20',
        chainId: ethChainId,
      })
    }
  }
}
