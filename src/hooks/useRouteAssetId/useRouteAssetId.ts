import type { AccountId, AssetId, ChainNamespace, ChainReference } from '@shapeshiftoss/caip'
import { toChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'

// Make sure this array remains ordered from most to least specific to avoid early matching
export const assetIdPaths = [
  '/:chainId/:assetSubId/:nftId/transactions', // DO NOT REMOVE - first match in case we're in a /transactions path, making sure the parsing is correct
  '/:chainId/:assetSubId/transactions', // DO NOT REMOVE - first match in case we're in a /transactions path, making sure the parsing is correct
  '/:chainId/:assetSubId/:nftId', // NFT token path template
  '/:chainId/:assetSubId', // Standard asset path template
]

const getRouteAssetId = (pathname: string) => {
  // Extract the chainId and assetSubId parts from an /assets route, see src/Routes/RoutesCommon.tsx
  const assetIdAssetsPathMatch = matchPath<{
    chainId: string
    assetSubId: string
    nftId?: string
  }>(pathname, {
    path: assetIdPaths
      .map(path => [`/markets/asset${path}`, `/wallet/asset${path}`, `/lending/pool${path}`])
      .flat(),
  })

  const assetIdAccountsPathMatch = matchPath<{
    accountId?: AccountId
    assetId?: AssetId
    chainNamespace?: ChainNamespace
    chainReference?: ChainReference
  }>(pathname, {
    path: [
      '/accounts/:accountId/:assetId',
      '/accounts/:chainNamespace\\::chainReference\\:(.+)',
      `/lending/poolAccount/:accountId/:assetId`,
      '/lending/poolAccount/:chainNamespace\\::chainReference\\:(.+)',
    ],
  })

  if (assetIdAssetsPathMatch?.params) {
    const { chainId, assetSubId, nftId } = assetIdAssetsPathMatch.params

    // add nft segment and nftId attribute for nft assets
    if (nftId) return `${chainId}/${assetSubId}/${nftId}`

    return `${chainId}/${assetSubId}`
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

    return decodeURIComponent(routeAssetId ?? '')
  }, [location.pathname])

  return assetId
}
