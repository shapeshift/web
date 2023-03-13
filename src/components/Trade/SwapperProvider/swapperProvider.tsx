import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Context, FC, PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useReducer } from 'react'
import { swapperReducer } from 'components/Trade/SwapperProvider/reducer'
import type { SwapperContextType } from 'components/Trade/SwapperProvider/types'

const SwapperContext = createContext<SwapperContextType | undefined>(undefined)

export function useSwapperState<T extends KnownChainIds = KnownChainIds>() {
  const context = useContext<SwapperContextType<T> | undefined>(
    SwapperContext as Context<SwapperContextType<T> | undefined>,
  )
  if (context === undefined) {
    throw new Error('useSwapperState must be used within a SwapperProvider')
  }

  return context
}

export const SwapperProvider: FC<PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(swapperReducer, {})

  const value: SwapperContextType = useMemo(() => ({ state, dispatch }), [state])

  return <SwapperContext.Provider value={value}>{children}</SwapperContext.Provider>
}
