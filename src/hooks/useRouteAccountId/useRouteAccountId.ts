import { useMemo } from 'react'
import { matchPath, useLocation } from 'react-router-dom'

// Define all possible paths that include accountId
const accountPaths = [
  '/accounts/:accountId/:chainId/:assetSubId/:nftId',
  '/accounts/:accountId/:chainId/:assetSubId',
  '/accounts/:accountId/:assetId',
  '/accounts/:accountId',
  '/lending/poolAccount/:accountId/:chainId/:assetSubId',
  '/lending/poolAccount/:accountId/:chainNamespace\\::chainReference/:assetSubId',
  '/lending/poolAccount/:accountId/:assetId',
  '/lending/poolAccount/:accountId',
]

const getRouteAccountId = (pathname: string) => {
  let match = null
  for (const path of accountPaths) {
    match = matchPath({ path, end: true }, pathname)
    if (match) break
  }

  if (match?.params) {
    const { accountId } = match.params
    return accountId
  }

  return ''
}

export const useRouteAccountId = () => {
  const location = useLocation()

  const accountId = useMemo(() => {
    const routeAccountId = getRouteAccountId(location.pathname)
    return decodeURIComponent(routeAccountId ?? '')
  }, [location.pathname])

  return accountId
}
