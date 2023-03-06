import type { KnownChainIds } from '@shapeshiftoss/types'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import type { Context, FC, PropsWithChildren } from 'react'
import { createContext, useContext, useMemo, useReducer } from 'react'
import { useAccountsService } from 'components/Trade/hooks/useAccountsService'
import { useAvailableSwappersService } from 'components/Trade/hooks/useAvailableSwappersService'
import { useFeesService } from 'components/Trade/hooks/useFeesService'
import { useTradeQuoteService } from 'components/Trade/hooks/useTradeQuoteService'
import { swapperReducer } from 'components/Trade/SwapperProvider/reducer'
import type { SwapperContextType, SwapperState } from 'components/Trade/SwapperProvider/types'
import { TradeAmountInputField } from 'components/Trade/types'

const initialState: SwapperState = {
  amount: '0',
  isExactAllowance: false,
  slippage: DEFAULT_SLIPPAGE,
  action: TradeAmountInputField.SELL_CRYPTO,
  isSendMax: false,
  sellTradeAsset: { amountCryptoPrecision: '0' },
  buyTradeAsset: { amountCryptoPrecision: '0' },
  fiatSellAmount: '0',
  fiatBuyAmount: '0',
}

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
  const [state, dispatch] = useReducer(swapperReducer, initialState)

  const context: SwapperContextType = useMemo(() => ({ state, dispatch }), [state])
  useTradeQuoteService(context)
  useAvailableSwappersService(context)
  useAccountsService(context)
  useFeesService(context)

  return <SwapperContext.Provider value={context}>{children}</SwapperContext.Provider>
}
