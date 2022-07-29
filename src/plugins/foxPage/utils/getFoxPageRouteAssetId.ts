import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { matchPath } from 'react-router'

const FOX_PAGE_DEFAULT_ASSET = 'fox'

export const getFoxPageRouteAssetId = (pathname: string) => {
  const foxPageAssetIdPathMatch = matchPath<{ foxAsset?: string }>(pathname, {
    path: '/fox/:foxAsset?',
  })

  if (foxPageAssetIdPathMatch) {
    const foxAsset = (foxPageAssetIdPathMatch?.params?.foxAsset ?? FOX_PAGE_DEFAULT_ASSET) as
      | 'fox'
      | 'foxy'

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
