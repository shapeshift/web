import { union } from 'lodash'
import React, { useMemo } from 'react'
import { matchPath, useHistory, useLocation, useParams } from 'react-router-dom'
import { generateAppRoutes } from 'Routes/helpers'
import { routes } from 'Routes/RoutesCommon'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useQuery } from 'hooks/useQuery/useQuery'

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

  const appRoutes = useMemo(() => {
    return generateAppRoutes(union(pluginRoutes, routes))
  }, [pluginRoutes])

  const currentRoute = useMemo(() => {
    return appRoutes.find(e => matchPath(location.pathname, { path: e.path, exact: true }))
  }, [appRoutes, location.pathname])

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
