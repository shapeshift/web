import { useContext } from 'react'
import {
  BrowserRouterContext,
  BrowserRouterContextProps,
} from 'context/BrowserRouterProvider/BrowserRouterContext'

export function useBrowserRouter<Q, P>() {
  const ctx = useContext<BrowserRouterContextProps<Q, P> | null>(BrowserRouterContext)
  if (!ctx) throw new Error("useBrowserRouter can't be used outside of BrowserRouterContext")
  return ctx
}
