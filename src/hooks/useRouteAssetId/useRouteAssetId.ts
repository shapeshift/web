import { AssetId } from '@shapeshiftoss/caip'
import { useEffect, useState } from 'react'
import { matchPath, useLocation } from 'react-router'

export const useRouteAssetId = () => {
  const location = useLocation()
  const [assetId, setAssetId] = useState<AssetId>('')

  useEffect(() => {
    // Extract the chainId and assetSubId parts from an /assets route, see src/Routes/RoutesCommon.tsx
    const assetIdPathMatch = matchPath<{ chainId: string; assetSubId: string }>(location.pathname, {
      path: '/assets/:chainId/:assetSubId',
    })
    if (!assetIdPathMatch?.params) return

    const { chainId, assetSubId } = assetIdPathMatch.params

    // Reconstitutes the assetId from valid matched params
    const assetId = `${chainId}/${assetSubId}`
    setAssetId(assetId)
  }, [location.pathname])

  return assetId
}
