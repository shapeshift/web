import type { ChainNamespace, ChainReference } from '@shapeshiftoss/caip'
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
  // Define all possible paths to check
  const assetPaths = [
    '/assets/:chainId/:assetSubId/:nftId',
    '/assets/:chainId/:assetSubId',
    '/wallet/:chainId/:assetSubId/:nftId',
    '/wallet/:chainId/:assetSubId',
    '/wallet/accounts/:accountId/:chainId/:assetSubId/:nftId',
    '/wallet/accounts/:accountId/:chainId/:assetSubId',
    '/lending/pool/:chainId/:assetSubId/:nftId',
    '/lending/pool/:chainId/:assetSubId',
    '/lending/poolAccount/:accountId/:chainId/:assetSubId',
    '/lending/poolAccount/:accountId/:chainNamespace\\::chainReference/:assetSubId',
  ]

  const accountPaths = [
    '/wallet/accounts/:accountId/:chainId/:assetSubId/:nftId',
    '/wallet/accounts/:accountId/:chainId/:assetSubId',
    '/accounts/:accountId/:assetId',
    '/accounts/:chainNamespace\\::chainReference\\:(.+)',
    '/lending/poolAccount/:accountId/:assetId',
    '/lending/poolAccount/:chainNamespace\\::chainReference\\:(.+)',
  ]

  // Try to match against asset paths
  let match = null
  for (const path of assetPaths) {
    match = matchPath({ path, end: true }, pathname)
    if (match) break
  }

  if (match?.params) {
    const { chainId, assetSubId, nftId } = match.params

    // add nft segment and nftId attribute for nft assets
    if (nftId) return `${chainId}/${assetSubId}/${nftId}`

    return `${chainId}/${assetSubId}`
  }

  // Try to match against account paths
  match = null
  for (const path of accountPaths) {
    match = matchPath({ path, end: true }, pathname)
    if (match) break
  }

  if (match?.params) {
    const { assetId, chainNamespace, chainReference } = match.params

    if (assetId) return assetId

    if (chainNamespace && chainReference) {
      const chainId = toChainId({
        chainNamespace: chainNamespace as ChainNamespace,
        chainReference: chainReference as ChainReference,
      })
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
