import type { AccountId, AssetId, ChainNamespace, ChainReference } from '@shapeshiftoss/caip'
import { toChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router-dom'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

// Make sure this array remains ordered from most to least specific to avoid early matching
export const assetIdPaths = [
  '/:chainId/:assetSubId/:nftId', // NFT token path template
  '/:chainId/:assetSubId', // Standard asset path template
]

const getRouteAssetId = (pathname: string) => {
  // Extract the chainId and assetSubId parts from an /assets route, see src/Routes/RoutesCommon.tsx
  const assetsPathPattern = assetIdPaths.map(path => `/assets${path}`)
  const lendingPathPattern = assetIdPaths.map(path => `/lending/pool${path}`)
  
  // In v6, we need to check each path individually since matchPath only accepts a single path
  const allAssetPaths = [...assetsPathPattern, ...lendingPathPattern]
  let assetIdAssetsPathMatch = null
  
  // Try each path until we find a match
  for (const path of allAssetPaths) {
    const match = matchPath(
      {
        path,
        end: false,
      },
      pathname
    )
    if (match) {
      assetIdAssetsPathMatch = match
      break
    }
  }

  // For account paths
  const accountPaths = [
    '/accounts/:accountId/:assetId',
    '/accounts/:chainNamespace\\::chainReference\\:(.+)',
    `/lending/poolAccount/:accountId/:assetId`,
    '/lending/poolAccount/:chainNamespace\\::chainReference\\:(.+)',
  ]
  
  let assetIdAccountsPathMatch = null
  
  // Try each path until we find a match
  for (const path of accountPaths) {
    const match = matchPath(
      {
        path,
        end: false,
      },
      pathname
    )
    if (match) {
      assetIdAccountsPathMatch = match
      break
    }
  }

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
