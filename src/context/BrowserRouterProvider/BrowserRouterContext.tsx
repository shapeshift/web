import type { History, Location } from 'history'
import { createContext } from 'react'
import type { Route as NestedRoute } from 'Routes/helpers'

export type BrowserRouterContextProps<Q, P> = {
  location: Location
  history: History
  params: P
  query: Q
  appRoutes: NestedRoute[]
  currentRoute: NestedRoute | void
}

export const BrowserRouterContext = createContext<BrowserRouterContextProps<any, any> | null>(null)
