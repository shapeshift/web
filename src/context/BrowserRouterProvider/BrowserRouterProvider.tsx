import { History, Location } from 'history'
import { union } from 'lodash'
import React, { useContext, useMemo } from 'react'
import { matchPath, useHistory, useLocation, useParams } from 'react-router-dom'
import { generateAppRoutes } from 'Routes/helpers'
import { Route as NestedRoute } from 'Routes/helpers'
import { routes } from 'Routes/RoutesTypes'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useQuery } from 'hooks/useQuery/useQuery'

type BrowserRouterContextProps<Q, P> = {
  location: Location
  history: History
  params: P
  query: Q
  appRoutes: NestedRoute[]
  currentRoute: NestedRoute | void
}

const BrowserRouterContext = React.createContext<BrowserRouterContextProps<any, any> | null>(null)

export function useBrowserRouter<Q, P>() {
  const ctx = useContext<BrowserRouterContextProps<Q, P> | null>(BrowserRouterContext)
  if (!ctx) throw new Error("useBrowserRouter can't be used outside of BrowserRouterContext")
  return ctx
}

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
      currentRoute
    }),
    [history, location, params, query, appRoutes, currentRoute]
  )

  return <BrowserRouterContext.Provider value={router}>{children}</BrowserRouterContext.Provider>
}
