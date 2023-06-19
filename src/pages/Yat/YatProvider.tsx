import { createContext } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'

type YatQueryParams = {
  eid?: string
}

type YatProviderProps = {
  children: React.ReactNode
}

const YatContext = createContext<null>(null)

/**
 * a thin context manager to listen to `?eid=<idOfPurchasedYat>` query param in route
 * to pass to and hence open YatModal
 */
export const YatProvider: React.FC<YatProviderProps> = ({ children }) => {
  const { query } = useBrowserRouter<YatQueryParams, {}>()
  const { eid } = query
  const { yat: yatModal } = useModal()
  const { isOpen, open } = yatModal
  eid && !isOpen && open({ eid })
  return <YatContext.Provider value={null}>{children}</YatContext.Provider>
}
