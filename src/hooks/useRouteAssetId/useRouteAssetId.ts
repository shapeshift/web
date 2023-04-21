import type { AccountId, AssetId, ChainNamespace, ChainReference } from '@shapeshiftoss/caip'
import { toChainId } from '@shapeshiftoss/caip'
import { getFoxPageRouteAssetId } from 'plugins/foxPage/utils/getFoxPageRouteAssetId'
import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

// Make sure this array remains ordered from most to least specific to avoid early matching
export const assetIdPaths = [
  '/:chainId/:assetSubId/pool/:poolId', // Osmosis LP token path template
  '/:chainId/:assetSubId', // Standard asset path template
]

const getRouteAssetId = (pathname: string) => {
  // Extract the chainId and assetSubId parts from an /assets route, see src/Routes/RoutesCommon.tsx
  const assetIdAssetsPathMatch = matchPath<{
    chainId: string
    assetSubId: string
    poolId?: string
  }>(pathname, {
    path: assetIdPaths.map(path => `/assets${path}`),
  })

  const assetIdAccountsPathMatch = matchPath<{
    accountId?: AccountId
    assetId?: AssetId
    chainNamespace?: ChainNamespace
    chainReference?: ChainReference
  }>(pathname, {
    path: ['/accounts/:accountId/:assetId', '/accounts/:chainNamespace\\::chainReference\\:(.+)'],
  })

  if (assetIdAssetsPathMatch?.params) {
    const { chainId, assetSubId, poolId = undefined } = assetIdAssetsPathMatch.params

    // Reconstitutes the assetId from valid matched params
    // If it's an Osmosis pool asset we need to add the pool segment and poolId attribute
    const assetId = `${chainId}/${assetSubId}${poolId ? `/pool/${poolId}` : ''}`
    return assetId
  }

  if (assetIdAccountsPathMatch?.params) {
    const { assetId, chainNamespace, chainReference } = assetIdAccountsPathMatch.params

    if (assetId) return assetId

    if (chainNamespace && chainReference) {
      const chainId = toChainId({ chainNamespace, chainReference })
      return getChainAdapterManager().get(chainId)?.getFeeAssetId()
    }

    return ''
  }
}

export const useRouteAssetId = () => {
  const location = useLocation()

  const assetId = useMemo(() => {
    const routeAssetId = getRouteAssetId(location.pathname)
    const foxPageRouteAssetId = getFoxPageRouteAssetId(location.pathname)

    return routeAssetId ?? foxPageRouteAssetId
  }, [location.pathname])

  return assetId
}
