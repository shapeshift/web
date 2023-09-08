import { foxAssetId, foxyAssetId } from '@shapeshiftoss/caip'
import { matchPath } from 'react-router'

const FOX_PAGE_DEFAULT_ASSET = 'fox'

export const getFoxPageRouteAssetId = (pathname: string) => {
  const foxPageAssetIdPathMatch = matchPath<{ foxAsset?: 'fox' | 'foxy' }>(pathname, {
    path: '/fox/:foxAsset?',
  })

  const foxAsset = foxPageAssetIdPathMatch?.params?.foxAsset ?? FOX_PAGE_DEFAULT_ASSET

  return foxAsset === 'fox' ? foxAssetId : foxyAssetId
}
