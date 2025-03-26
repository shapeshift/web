import { union } from 'lodash'
import React, { useEffect, useMemo } from 'react'
import { matchPath, useLocation, useNavigate, useParams } from 'react-router-dom'

import { BrowserRouterContext } from './BrowserRouterContext'

import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useQuery } from '@/hooks/useQuery/useQuery'
import { mapMixpanelPathname } from '@/lib/mixpanel/helpers'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { generateAppRoutes } from '@/Routes/helpers'
import { routes } from '@/Routes/RoutesCommon'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type BrowserRouterProviderProps = {
  children: React.ReactNode
}

export function BrowserRouterProvider({ children }: BrowserRouterProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const query = useQuery()
  const { routes: pluginRoutes } = usePlugins()
  const assets = useAppSelector(selectAssets)

  const appRoutes = useMemo(() => {
    return generateAppRoutes(union(pluginRoutes, routes))
  }, [pluginRoutes])

  const currentRoute = useMemo(() => {
    return appRoutes.find(e =>
      matchPath(
        {
          path: e.path,
          end: true,
        },
        location.pathname,
      ),
    )
  }, [appRoutes, location.pathname])

  console.log({ pathname: location.pathname, appRoutes, currentRoute })

  useEffect(() => {
    const maybePathname = mapMixpanelPathname(location.pathname, assets)
    if (maybePathname !== null)
      getMixPanel()?.track(MixPanelEvent.PageView, { pathname: maybePathname })
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
