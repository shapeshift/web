import { union } from 'lodash'
import React, { useEffect, useMemo } from 'react'
import { matchPath, useHistory, useLocation, useParams } from 'react-router-dom'
import { generateAppRoutes } from 'Routes/helpers'
import { routes } from 'Routes/RoutesCommon'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useQuery } from 'hooks/useQuery/useQuery'
import { mapMixpanelPathname } from 'lib/mixpanel/helpers'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { BrowserRouterContext } from './BrowserRouterContext'

type BrowserRouterProviderProps = {
  children: React.ReactNode
}

export function BrowserRouterProvider({ children }: BrowserRouterProviderProps) {
  const location = useLocation()
  const history = useHistory()
  const params = useParams()
  const query = useQuery()
  const { routes: pluginRoutes } = usePlugins()
  const assets = useAppSelector(selectAssets)

  const appRoutes = useMemo(() => {
    return generateAppRoutes(union(pluginRoutes, routes))
  }, [pluginRoutes])

  const currentRoute = useMemo(() => {
    return appRoutes.find(e => matchPath(location.pathname, { path: e.path, exact: true }))
  }, [appRoutes, location.pathname])

  useEffect(() => {
    const maybePathname = mapMixpanelPathname(location.pathname, assets)
    if (maybePathname !== null)
      getMixPanel()?.track(MixPanelEvents.PageView, { pathname: maybePathname })
  }, [assets, location.pathname])

  const router = useMemo(
    () => ({
      history,
      location,
      params,
      query,
      appRoutes,
      currentRoute,
    }),
    [history, location, params, query, appRoutes, currentRoute],
  )

  return <BrowserRouterContext.Provider value={router}>{children}</BrowserRouterContext.Provider>
}
