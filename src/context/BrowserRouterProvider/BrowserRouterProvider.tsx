import { History, Location } from 'history'
import React, { useContext, useMemo } from 'react'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import { useQuery } from 'hooks/useQuery/useQuery'

type BrowserRouterContextProps<Q, P> = {
  location: Location
  history: History
  params: P
  query: Q
}

const BrowserRouterContext = React.createContext<BrowserRouterContextProps<any, any> | null>(null)

export function useBrowserRouter<Q, P>() {
  const ctx = useContext<BrowserRouterContextProps<Q, P> | null>(BrowserRouterContext)
  if (!ctx) throw new Error('blah')
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

  const router = useMemo(
    () => ({
      history,
      location,
      params,
      query
    }),
    [query, params, location, history]
  )

  return <BrowserRouterContext.Provider value={router}>{children}</BrowserRouterContext.Provider>
}
