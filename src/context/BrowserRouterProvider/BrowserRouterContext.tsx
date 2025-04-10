import type { Location } from 'history'
import { createContext } from 'react'
import type { NavigateFunction } from 'react-router'

import type { Route as NestedRoute } from '@/Routes/helpers'

export type BrowserRouterContextProps<Q, P> = {
  location: Location
  navigate: NavigateFunction
  params: P
  query: Q
  appRoutes: NestedRoute[]
  currentRoute: NestedRoute | void
}

export const BrowserRouterContext = createContext<BrowserRouterContextProps<any, any> | null>(null)
