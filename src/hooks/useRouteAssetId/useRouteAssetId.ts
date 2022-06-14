import { AssetId } from '@shapeshiftoss/caip'
import { getFoxPageRouteAssetId } from 'plugins/foxPage/utils/getFoxPageRouteAssetId'
import { useEffect, useState } from 'react'
import { matchPath, useLocation } from 'react-router'

const getRouteAssetId = (pathname: string) => {
  // Extract the chainId and assetSubId parts from an /assets route, see src/Routes/RoutesCommon.tsx
  const assetIdPathMatch = matchPath<{ chainId: string; assetSubId: string }>(pathname, {
    path: '/assets/:chainId/:assetSubId',
  })

  if (assetIdPathMatch?.params) {
    const { chainId, assetSubId } = assetIdPathMatch.params

    // Reconstitutes the assetId from valid matched params
    const assetId = `${chainId}/${assetSubId}`
    return assetId
  }
}

export const useRouteAssetId = () => {
  const location = useLocation()
  const [assetId, setAssetId] = useState<AssetId>('')

  useEffect(() => {
    const routeAssetId = getRouteAssetId(location.pathname)
    const foxPageRouteAssetId = getFoxPageRouteAssetId(location.pathname)

    if (routeAssetId || foxPageRouteAssetId) {
      setAssetId(routeAssetId ?? foxPageRouteAssetId ?? '')
    }
  }, [location.pathname])

  return assetId
}
